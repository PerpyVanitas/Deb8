import * as Sentry from '@sentry/nextjs'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { aiRateLimit } from '@/lib/rate-limit'
import { inngest } from '@/lib/inngest/client'
import { revalidatePath } from 'next/cache'
import { analysisRequestSchema, analysisResponseSchema } from '@/lib/inngest/types'

export const maxDuration = 15

function isDegradedAnalysis(analysis: any) {
  const text = `${analysis?.rfd_summary || ''}`.toLowerCase()
  return text.includes('unable to analyze') || text.includes('ai quota') || text.includes('quota limits')
}

export async function POST(req: Request) {
  const ip =
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    '127.0.0.1'
  const { success } = await aiRateLimit.limit(ip)
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded. Please wait.' }, { status: 429 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { sessionId, harshness } = analysisRequestSchema.parse(body)

    const { data: transcripts, error: transcriptError } = await supabase
      .from('transcripts')
      .select('speaker_index')
      .eq('session_id', sessionId)

    if (transcriptError) throw transcriptError

    const FREE_TIER_SAFE_LIMIT = 10
    if ((transcripts?.length || 0) > FREE_TIER_SAFE_LIMIT) {
      return NextResponse.json(
        {
          error: `This session has ${transcripts?.length || 0} speakers, which may exceed Gemini free-tier capacity. Try reducing the session size or upgrading your model plan.`
        },
        { status: 422 }
      )
    }

    const { data: session, error: sessionError } = await supabase
      .from('debate_sessions')
      .select('status')
      .eq('id', sessionId)
      .single()

    if (sessionError) throw sessionError
    if (!session) throw new Error('Session not found')

    const { data: existingAnalyses, error: existingAnalysesError } = await supabase
      .from('analyses')
      .select('rfd_summary')
      .eq('session_id', sessionId)

    if (existingAnalysesError) throw existingAnalysesError

    const hasOnlyDegradedAnalyses =
      (existingAnalyses?.length || 0) > 0 &&
      existingAnalyses!.every(isDegradedAnalysis)

    if (session.status === 'analyzing' || (session.status === 'analyzed' && !hasOnlyDegradedAnalyses)) {
      console.log('Analyze route: session already in progress or complete, skipping duplicate enqueue', {
        sessionId,
        status: session.status
      })
      return NextResponse.json(analysisResponseSchema.parse({ success: true, queued: true }))
    }

    const { data: updatedSession, error: updateError } = await supabase
      .from('debate_sessions')
      .update({ status: 'analyzing' })
      .eq('id', sessionId)
      .in('status', ['pending', 'recorded', 'analyzed'])
      .select('status')
      .maybeSingle()

    if (updateError) {
      console.warn('Analyze route: failed to mark session as analyzing', { sessionId, error: updateError })
    }

    if (!updatedSession) {
      const { data: currentSession, error: currentSessionError } = await supabase
        .from('debate_sessions')
        .select('status')
        .eq('id', sessionId)
        .single()
      if (currentSessionError) throw currentSessionError
      if (currentSession?.status === 'analyzing' || currentSession?.status === 'analyzed') {
        console.log('Analyze route: another process started analysis first; skipping duplicate', {
          sessionId,
          status: currentSession?.status
        })
        return NextResponse.json(analysisResponseSchema.parse({ success: true, queued: true }))
      }
    }

    // Dispatch the analysis pipeline to the Inngest background queue
    console.log('Analyze route: sending analysis/start event', { sessionId, userId: user.id, harshness })
    try {
      await inngest.send({
        name: "analysis/start",
        data: {
          sessionId,
          userId: user.id,
          harshness
        }
      });
      console.log('Analyze route: analysis/start event sent successfully', { sessionId })
    } catch (sendError) {
      console.error('Analyze route: failed to send analysis/start event', sendError, { sessionId, userId: user.id, harshness })
      throw sendError
    }

    try {
      revalidatePath('/dashboard')
      revalidatePath(`/sessions/${sessionId}/analysis`)
    } catch (err) {
      console.error('Analyze route cache revalidation failed', err)
    }

    return NextResponse.json(analysisResponseSchema.parse({ success: true, queued: true }))
  } catch (error: any) {
    Sentry.captureException(error)
    console.error("Analyze Route Error:", error)
    if (error?.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 })
    }
    return NextResponse.json({ error: error?.message ?? 'Internal server error' }, { status: 500 })
  }
}
