import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { analyzeDebateSpeech, generateBallot, generateFactChecks } from '@/lib/gemini/analyze'
import { generateAutomatedBenchmark } from '@/lib/gemini/benchmarking'
import { updateSkills } from '@/lib/progression/updateSkills'
import { aiRateLimit } from '@/lib/rate-limit'

export const maxDuration = 60; // Allow Vercel to run up to 60s

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
  const { success } = await aiRateLimit.limit(ip)
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded. Please wait.' }, { status: 429 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { sessionId } = await req.json()

    // Fetch session, motion, and transcript
    const [sessionRes, transcriptRes] = await Promise.all([
      supabase.from('debate_sessions').select('*, motions(text)').eq('id', sessionId).single(),
      supabase.from('transcripts').select('*').eq('session_id', sessionId).single()
    ])

    if (sessionRes.error) throw sessionRes.error
    if (transcriptRes.error) throw transcriptRes.error

    const session = sessionRes.data
    const transcript = transcriptRes.data

    // Analyze using Gemini in parallel
    const [analysis, ballot, factChecks] = await Promise.all([
      analyzeDebateSpeech({
        transcript: transcript.raw_text,
        motion: session.motions.text,
        role: session.role,
        wordCount: transcript.word_count
      }),
      generateBallot({
        transcript: transcript.raw_text,
        motion: session.motions.text,
        role: session.role
      }),
      generateFactChecks({
        transcript: transcript.raw_text,
        motion: session.motions.text
      })
    ])

    // Generate automated elite benchmark
    const elite_benchmark = await generateAutomatedBenchmark(analysis, session.motions.text)

    // Save to analyses table
    const { error: insertError } = await supabase
      .from('analyses')
      .upsert({ 
        session_id: sessionId, 
        ...analysis,
        elite_benchmark
      }, { onConflict: 'session_id' })

    if (insertError) throw insertError

    // Save ballot
    const { error: ballotError } = await supabase
      .from('ballots')
      .upsert({
        session_id: sessionId,
        ...ballot
      }, { onConflict: 'session_id' })

    if (ballotError) console.error("Error saving ballot:", ballotError)

    // Save fact checks
    if (factChecks && factChecks.length > 0) {
      const factCheckRows = factChecks.map((fc: any) => ({
        session_id: sessionId,
        claim: fc.claim,
        verdict: fc.verdict,
        confidence: fc.confidence,
        explanation: fc.explanation,
        sources: fc.sources
      }))
      const { error: factCheckError } = await supabase.from('fact_checks').insert(factCheckRows)
      if (factCheckError) console.error("Error saving fact checks:", factCheckError)
    }

    // Update session status
    await supabase
      .from('debate_sessions')
      .update({ status: 'analyzed' })
      .eq('id', sessionId)

    // Update debate DNA
    if (analysis.scores) {
      await updateSkills(user.id, sessionId, analysis.scores)
    }

    return NextResponse.json({ success: true, analysis: { ...analysis, elite_benchmark } })
  } catch (error: any) {
    console.error("Analyze Route Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

