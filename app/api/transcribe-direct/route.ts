import { NextResponse } from 'next/server'
import { transcribeAudio } from '@/lib/groq/transcribe'

export const maxDuration = 60; // Allow Vercel to run up to 60s

import { transcriptionRateLimit } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'

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
    const formData = await req.formData()
    const file = formData.get('file') as Blob

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const { text } = await transcribeAudio(buffer)
    
    return NextResponse.json({ text })
  } catch (error: any) {
    console.error("Direct Transcription Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

