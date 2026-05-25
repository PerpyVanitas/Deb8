import * as Sentry from '@sentry/nextjs'
import { google } from '@ai-sdk/google'
import { streamText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { geminiRateLimit } from '@/lib/rate-limit'

export async function POST(req: Request) {
  try {
    const { success } = await geminiRateLimit.limit('global')
    if (!success) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please wait.' }), {
        status: 429,
        headers: { 'content-type': 'application/json' }
      })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { messages, analysis, motion } = await req.json()

  // Convert the analysis object into a string summary so the bot knows the context
  const contextSystemPrompt = `You are an elite competitive debate coach.
You recently judged the user's speech on the motion: "${motion}".
Here is the grading rubric and feedback you gave them:
${JSON.stringify(analysis, null, 2)}

The user is now chatting with you to appeal their score, ask for clarification on your feedback, or request specific debate drills.
Be helpful, analytical, and objective. If they make a good point appealing a score, acknowledge it, but explain your reasoning firmly. Do NOT use markdown code blocks for the JSON, just answer naturally as a human coach.`

    const result = await streamText({
      model: google('gemini-2.0-flash'),
      system: contextSystemPrompt,
      messages,
    })

    return result.toTextStreamResponse()
  } catch (error: any) {
    Sentry.captureException(error)
    return new Response(JSON.stringify({ error: error?.message ?? 'Internal server error' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    })
  }
}
