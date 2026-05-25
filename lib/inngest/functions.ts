import { inngest } from "./client";
import { createClient } from '@supabase/supabase-js'
import { analyzeDebateSpeech, generateBallot, generateFactChecks } from '@/lib/gemini/analyze'
import { generateAutomatedBenchmark } from '@/lib/gemini/benchmarking'
import { updateSkills } from '@/lib/progression/updateSkills'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export const helloFn = inngest.createFunction(
  { id: "hello-fn" },
  { event: "test/hello" },
  async ({ event }) => {
    console.log("Hello:", event);
    return { message: "Hello from Inngest!" };
  }
);

export const analyzeSessionFn = inngest.createFunction(
  { id: "analyze-session", retries: 2 },
  { event: "analysis/start" },
  async ({ event, step }) => {
    const { sessionId, userId, harshness } = event.data;

    // 1. Fetch data
    const { session, transcripts } = await step.run("fetch-data", async () => {
      const [sessionRes, transcriptsRes] = await Promise.all([
        supabase.from('debate_sessions').select('*, motions(text)').eq('id', sessionId).single(),
        supabase.from('transcripts').select('*').eq('session_id', sessionId)
      ])
      if (sessionRes.error) throw sessionRes.error
      if (transcriptsRes.error) throw transcriptsRes.error
      return { session: sessionRes.data, transcripts: transcriptsRes.data }
    });

    // 2. Sequential Gemini tasks with sleeps to respect Free Tier 15 RPM limit
    const analysisResults: any[] = [];
    for (let i = 0; i < transcripts.length; i++) {
      const transcript = transcripts[i];
      const roleStr = transcript.speaker_role || session.role;
      
      const a = await step.run(`analyze-speech-${i}`, async () => {
        return await analyzeDebateSpeech({
          transcript: transcript.raw_text,
          motion: session.motions.text,
          role: roleStr,
          wordCount: transcript.word_count,
          durationSeconds: transcript.duration_seconds,
          format: session.format,
          harshness: harshness
        });
      });
      await step.sleep(`sleep-after-analyze-${i}`, "4s");
      
      const b = await step.run(`generate-ballot-${i}`, async () => {
        return await generateBallot({
          transcript: transcript.raw_text,
          motion: session.motions.text,
          role: roleStr,
          format: session.format
        });
      });
      await step.sleep(`sleep-after-ballot-${i}`, "4s");
      
      const fc = await step.run(`generate-factchecks-${i}`, async () => {
        return await generateFactChecks({
          transcript: transcript.raw_text,
          motion: session.motions.text
        });
      });
      await step.sleep(`sleep-after-fc-${i}`, "4s");
      
      analysisResults.push({
        analysis: a,
        ballot: b,
        factChecks: fc,
        speakerIndex: transcript.speaker_index,
        speakerRole: roleStr
      });
    }

    // 3. Benchmarking (also sequential with sleeps)
    const benchmarkResults: any[] = [];
    for (let i = 0; i < analysisResults.length; i++) {
      const res = analysisResults[i];
      const benchmark = await step.run(`generate-benchmark-${i}`, async () => {
        return await generateAutomatedBenchmark(res.analysis, session.motions.text);
      });
      await step.sleep(`sleep-after-benchmark-${i}`, "4s");
      benchmarkResults.push({ speakerIndex: res.speakerIndex, benchmark });
    }

    // 4. Save to DB
    // 4. Save to DB
    await step.run("save-results", async () => {
      for (const res of analysisResults) {
        const bench = benchmarkResults.find((b: any) => b.speakerIndex === res.speakerIndex)?.benchmark
        
        await supabase.from('analyses').upsert({ 
          session_id: sessionId, 
          speaker_index: res.speakerIndex,
          speaker_role: res.speakerRole,
          ...res.analysis,
          elite_benchmark: bench
        }, { onConflict: 'session_id, speaker_index' });

        await supabase.from('ballots').upsert({
          session_id: sessionId,
          speaker_index: res.speakerIndex,
          ...res.ballot
        }, { onConflict: 'session_id, speaker_index' });

        if (res.factChecks && res.factChecks.length > 0) {
          const factCheckRows = res.factChecks.map((fc: any) => ({
            session_id: sessionId,
            speaker_index: res.speakerIndex,
            claim: fc.claim,
            verdict: fc.verdict,
            confidence: fc.confidence,
            explanation: fc.explanation,
            sources: fc.sources
          }));
          // Delete existing for this speaker to prevent duplication on retry
          await supabase.from('fact_checks').delete().eq('session_id', sessionId).eq('speaker_index', res.speakerIndex);
          await supabase.from('fact_checks').insert(factCheckRows);
        }
      }
    });

    // 5. Update Skills and Session Status
    // 5. Update Skills and Session Status
    await step.run("finalize-session", async () => {
      await supabase.from('debate_sessions').update({ status: 'analyzed' }).eq('id', sessionId);
      
      // Update skills based on the first speaker (the primary user)
      const primaryRes = analysisResults.find((r: any) => r.speakerIndex === 0)
      if (primaryRes && primaryRes.analysis.scores) {
        await updateSkills(userId, sessionId, primaryRes.analysis.scores);
      }
    });

    return { success: true, sessionId };
  }
);

export const sweepStuckSessionsFn = inngest.createFunction(
  { id: "sweep-stuck-sessions" },
  { cron: "0 * * * *" }, // Run every hour
  async ({ step }) => {
    await step.run("delete-stuck-sessions", async () => {
      // Find sessions stuck in 'pending' or 'recorded' for more than 24 hours
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('debate_sessions')
        .delete()
        .in('status', ['pending', 'recorded'])
        .lt('created_at', yesterday)
        .select();
        
      if (error) throw error;
      return { deletedCount: data?.length || 0 };
    });
  }
);
