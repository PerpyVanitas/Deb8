import { NextResponse } from 'next/server'
import { generateOpponentRebuttal } from '@/lib/gemini/opponent'
import { aiRateLimit } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60; // Allow up to 60s

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
    const { transcript, motion, persona, role, format } = await req.json()

    if (!transcript || !motion) {
      return NextResponse.json({ error: 'Missing transcript or motion' }, { status: 400 })
    }

    const rebuttal = await generateOpponentRebuttal({
      transcript,
      motion,
      persona: persona || 'aggressive',
      role,
      format
    })

    return NextResponse.json({ rebuttal })
  } catch (error: any) {
    console.error("Opponent API Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

