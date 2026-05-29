import * as Sentry from '@sentry/nextjs'
import { inngest } from "./client";
import { createClient } from '@supabase/supabase-js'
import {
  analyzeSpeakerArguments,
  analyzeSpeakerCoaching,
  analyzeSpeakerCore,
  mapUnifiedToLegacy
} from '@/lib/gemini/unified'
import { updateSkills } from '@/lib/progression/updateSkills'
import { analysisEventSchema } from '@/lib/inngest/types'
import { geminiRateLimit } from '@/lib/rate-limit'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

function throwIfSupabaseError(error: any) {
  if (error) throw error
}

function isDegradedAnalysis(analysis: any) {
  const text = `${analysis?.rfd_summary || ''}`.toLowerCase()
  return text.includes('unable to analyze') || text.includes('ai quota') || text.includes('quota limits')
}

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
    console.log('Inngest analyzeSessionFn: received event', { name: event.name, data: event.data })
    try {
      const { sessionId, userId, harshness } = analysisEventSchema.parse(event.data)

      // 1. Fetch data
      const { session, transcripts } = await step.run("fetch-data", async () => {
        const [sessionRes, transcriptsRes] = await Promise.all([
          supabase.from('debate_sessions').select('*, motions(text)').eq('id', sessionId).single(),
          supabase.from('transcripts').select('*').eq('session_id', sessionId).order('speaker_index', { ascending: true })
        ])
        if (sessionRes.error) throw sessionRes.error
        if (transcriptsRes.error) throw transcriptsRes.error
        return { session: sessionRes.data, transcripts: transcriptsRes.data }
      });

      // 2. Sequential Gemini tasks, saved section-by-section in priority order.
      const analysisResults: {
        analysis: any,
        ballot: any,
        benchmark: any,
        factChecks: any[],
        speakerIndex: number,
        speakerRole: string
      }[] = [];

      async function runGeminiStep<T>(stepName: string, task: () => Promise<T>) {
        const maxRetries = 12
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          const limit = await geminiRateLimit.limit('global')
          if (limit.success) {
            return await step.run(stepName, task)
          }

          const resetMs = limit.reset ? Math.max(0, limit.reset - Date.now()) : 0
          const waitMs = Math.max(5000 * (attempt + 1), resetMs)
          console.warn(`Gemini rate limit hit for ${stepName}; retrying in ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`)
          await step.sleep(`${stepName}-rate-limit-wait-${attempt + 1}`, `${waitMs}ms`)
        }
        throw new Error('Gemini rate limit exceeded. Please retry later.')
      }

      const INTER_SECTION_DELAY_MS = 8000
      const INTER_SPEAKER_DELAY_MS = 5000

      for (let i = 0; i < transcripts.length; i++) {
        const transcript = transcripts[i];
        const roleStr = transcript.speaker_role || `Speaker ${transcript.speaker_index + 1}`;

        const coreUnified = await runGeminiStep(`analyze-speaker-core-${i}`, async () => {
          return await analyzeSpeakerCore(
            transcript.raw_text,
            roleStr,
            session.format,
            { harshness }
          )
        });

        const { analysis, ballot } = mapUnifiedToLegacy(coreUnified)

        analysisResults.push({
          analysis,
          ballot,
          benchmark: null,
          factChecks: [],
          speakerIndex: transcript.speaker_index,
          speakerRole: roleStr
        });

        await step.run(`save-speaker-core-${i}`, async () => {
          const analysisRes = await supabase.from('analyses').upsert({
            session_id: sessionId,
            speaker_index: transcript.speaker_index,
            speaker_role: roleStr,
            ...analysis,
            elite_benchmark: null
          }, { onConflict: 'session_id, speaker_index' });
          throwIfSupabaseError(analysisRes.error)

          const ballotRes = await supabase.from('ballots').upsert({
            session_id: sessionId,
            speaker_index: transcript.speaker_index,
            ...ballot
          }, { onConflict: 'session_id, speaker_index' });
          throwIfSupabaseError(ballotRes.error)
        })

        if (isDegradedAnalysis(analysis)) {
          console.warn(`Skipping lower-priority analysis stages for ${roleStr}; core analysis is degraded.`)
          if (i < transcripts.length - 1) {
            await step.sleep(`sleep-after-degraded-core-${i}`, `${INTER_SPEAKER_DELAY_MS}ms`)
          }
          continue
        }

        await step.sleep(`sleep-after-core-${i}`, `${INTER_SECTION_DELAY_MS}ms`)

        const argumentResult = await runGeminiStep(`analyze-speaker-arguments-${i}`, async () => {
          return await analyzeSpeakerArguments(
            transcript.raw_text,
            roleStr,
            session.format,
            { harshness }
          )
        })

        await step.run(`save-speaker-arguments-${i}`, async () => {
          const analysisRes = await supabase
            .from('analyses')
            .update({ arguments: argumentResult.arguments ?? [] })
            .eq('session_id', sessionId)
            .eq('speaker_index', transcript.speaker_index)
          throwIfSupabaseError(analysisRes.error)

          if (argumentResult.fact_checks && argumentResult.fact_checks.length > 0) {
            const factCheckRows = argumentResult.fact_checks.map((fc: any) => ({
              session_id: sessionId,
              speaker_index: transcript.speaker_index,
              claim: fc.claim,
              verdict: fc.verdict,
              confidence: 0,
              explanation: fc.explanation,
              sources: []
            }))
            const factChecksRes = await supabase.from('fact_checks').upsert(factCheckRows, {
              onConflict: 'session_id, speaker_index, claim'
            })
            throwIfSupabaseError(factChecksRes.error)
          }
        })

        analysisResults[analysisResults.length - 1].analysis.arguments = argumentResult.arguments ?? []
        analysisResults[analysisResults.length - 1].factChecks = argumentResult.fact_checks ?? []

        await step.sleep(`sleep-after-arguments-${i}`, `${INTER_SECTION_DELAY_MS}ms`)

        const coachingResult = await runGeminiStep(`analyze-speaker-coaching-${i}`, async () => {
          return await analyzeSpeakerCoaching(
            transcript.raw_text,
            roleStr,
            session.format,
            { harshness }
          )
        })

        const updatedCoaching = {
          ...analysis.coaching,
          drills: coachingResult.drills ?? []
        }

        await step.run(`save-speaker-coaching-${i}`, async () => {
          const analysisRes = await supabase
            .from('analyses')
            .update({
              coaching: updatedCoaching,
              elite_benchmark: coachingResult.benchmark ?? null
            })
            .eq('session_id', sessionId)
            .eq('speaker_index', transcript.speaker_index)
          throwIfSupabaseError(analysisRes.error)
        })

        analysisResults[analysisResults.length - 1].analysis.coaching = updatedCoaching
        analysisResults[analysisResults.length - 1].benchmark = coachingResult.benchmark ?? null

        if (i < transcripts.length - 1) {
          await step.sleep(`sleep-after-speaker-${i}`, `${INTER_SPEAKER_DELAY_MS}ms`)
        }
      }

      // 3. Update Skills and Session Status
      await step.run("finalize-session", async () => {
        const sessionUpdateRes = await supabase.from('debate_sessions').update({ status: 'analyzed' }).eq('id', sessionId);
        throwIfSupabaseError(sessionUpdateRes.error)

        const primaryRes = analysisResults.find((r: any) => r.speakerIndex === 0)
        if (primaryRes && primaryRes.analysis.scores) {
          await updateSkills(userId, sessionId, primaryRes.analysis.scores);
        }
      });

      return { success: true, sessionId };
    } catch (error: any) {
      Sentry.captureException(error)
      console.error('Inngest analyzeSessionFn Error:', error)
      throw error
    }
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
