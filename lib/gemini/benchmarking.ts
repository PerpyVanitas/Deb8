import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import { embedText } from './embed'
import { createClient } from '@supabase/supabase-js'
// Server-side supabase client for RPC calls inside lib functions
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function generateAutomatedBenchmark(analysis: any, motion: string) {
  // 1. Pick the most 'average' or 'poor' segment to benchmark, or fallback to the first argument/rebuttal
  const segments = analysis.structural_segments || []
  let targetSegment = segments.find((s: any) => s.quality_rating === 'poor')
  if (!targetSegment) {
    targetSegment = segments.find((s: any) => s.quality_rating === 'average')
  }
  if (!targetSegment && segments.length > 0) {
    targetSegment = segments[0]
  }

  if (!targetSegment) return null

  // 2. Embed the text
  const userText = targetSegment.text_snippet
  let embedding: number[]
  try {
    embedding = await embedText(userText)
  } catch (err) {
    console.error("Failed to embed text for benchmark", err)
    return null
  }

  // 3. Query Postgres for the closest elite match
  const { data: matches, error } = await supabase.rpc('match_elite_examples', {
    query_embedding: embedding,
    match_threshold: 0.5, // require at least 50% similarity
    match_count: 1
  })

  if (error || !matches || matches.length === 0) {
    console.error("No elite match found or error", error)
    return null
  }

  const eliteMatch = matches[0]

  // 4. Generate comparison via Gemini
  const model = google('gemini-2.0-flash')
  const prompt = `You are an elite debate coach.
The debater is speaking on: "${motion}".
Here is a segment from the user's speech (${targetSegment.segment_type}):
"${userText}"

Here is a highly rated segment from elite debater ${eliteMatch.debater_name} on a similar topic:
"${eliteMatch.content}"

Write a concise, 2-3 paragraph comparison. Explain why the elite debater's approach is structurally or rhetorically stronger, and give the user one specific actionable takeaway to sound more like the elite debater.`

  try {
    const result = await generateText({
      model,
      prompt,
    })
    const comparison = result.text.trim()
    
    return {
      userSegment: userText,
      segmentType: targetSegment.segment_type,
      eliteDebater: eliteMatch.debater_name,
      eliteSegment: eliteMatch.content,
      comparison
    }
  } catch (err) {
    console.error("Failed to generate benchmark comparison", err)
    return null
  }
}
