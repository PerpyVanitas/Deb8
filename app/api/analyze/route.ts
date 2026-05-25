import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { aiRateLimit } from '@/lib/rate-limit'
import { inngest } from '@/lib/inngest/client'
import { revalidatePath } from 'next/cache'
import { analysisRequestSchema, analysisResponseSchema } from '@/lib/inngest/types'

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
    const body = await req.json()
    const { sessionId, harshness } = analysisRequestSchema.parse(body)

    // Dispatch the analysis pipeline to the Inngest background queue
    await inngest.send({
      name: "analysis/start",
      data: {
        sessionId,
        userId: user.id,
        harshness
      }
    });

    try {
      revalidatePath('/dashboard')
      revalidatePath(`/sessions/${sessionId}/analysis`)
    } catch (err) {
      console.error('Analyze route cache revalidation failed', err)
    }

    return NextResponse.json(analysisResponseSchema.parse({ success: true, queued: true }))
  } catch (error: any) {
    console.error("Analyze Route Error:", error)
    if (error?.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
