import * as Sentry from '@sentry/nextjs'
import { NextResponse } from 'next/server'
import { generateOpponentRebuttal } from '@/lib/gemini/opponent'
import { aiRateLimit, geminiRateLimit } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'

async function ensureGeminiLimit(retries = 4) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const { success } = await geminiRateLimit.limit('global')
    if (success) return true

    const waitMs = 2000 * 2 ** attempt
    await new Promise(resolve => setTimeout(resolve, waitMs))
  }
  return false
}

export const maxDuration = 60; // Allow up to 60s

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
  const { success } = await aiRateLimit.limit(ip)
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded. Please wait.' }, { status: 429 })
  }

  const geminiLimit = await ensureGeminiLimit()
  if (!geminiLimit) {
    return NextResponse.json({ error: 'Gemini rate limit exceeded. Please wait.' }, { status: 429 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { transcript, motion, persona, role, format } = await req.json()

    if (!transcript || !motion) {
      return NextResponse.json({ error: 'Missing transcript or motion. Please make sure your speech was captured correctly.' }, { status: 400 })
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
    Sentry.captureException(error)
    console.error("Opponent API Error:", error)
    return NextResponse.json({ error: error?.message ?? 'Internal server error' }, { status: 500 })
  }
}

