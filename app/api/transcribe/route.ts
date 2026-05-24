import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { transcribeAudio } from '@/lib/groq/transcribe'

export const maxDuration = 60; // Allow Vercel to run up to 60s

import { transcriptionRateLimit } from '@/lib/rate-limit'

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
  const { success } = await transcriptionRateLimit.limit(ip)
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded. Please wait.' }, { status: 429 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { sessionId, path } = await req.json()

    // 1. Download from storage
    const { data: blob, error: downloadError } = await supabase.storage
      .from('speeches')
      .download(path)
      
    if (downloadError || !blob) {
      throw new Error(`Failed to download audio: ${downloadError?.message}`)
    }

    // 2. Transcribe via Groq
    const buffer = await blob.arrayBuffer()
    const { text, segments, duration } = await transcribeAudio(buffer)
    
    // 3. Calculate word count
    const wordCount = text.split(/\s+/).filter(Boolean).length

    // 4. Save to transcripts table
    const { error: insertError } = await supabase
      .from('transcripts')
      .upsert({
        session_id: sessionId,
        raw_text: text,
        word_count: wordCount,
        duration_seconds: Math.round(duration),
        segments: segments
      }, { onConflict: 'session_id' })

    if (insertError) throw insertError

    // 5. Update session status
    await supabase
      .from('debate_sessions')
      .update({ status: 'recorded' })
      .eq('id', sessionId)

    return NextResponse.json({ success: true, text, wordCount })
  } catch (error: any) {
    console.error("Transcription Route Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

