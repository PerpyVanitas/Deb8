import { google } from '@ai-sdk/google'
import { generateTextWithFallback } from './utils'

export type UnifiedAnalysis = {
  analysis: {
    structure_score: number
    logic_score: number
    rhetoric_score: number
    structure_feedback: string
    logic_feedback: string
    rhetoric_feedback: string
    overall_feedback: string
    key_strengths: string[]
    areas_for_improvement: string[]
  }
  ballot: {
    decision: string
    rfd: string
    rank: number
  }
  fact_checks: Array<{
    claim: string
    verdict: 'accurate' | 'inaccurate' | 'unverifiable'
    explanation: string
  }>
}

const MODEL = google('gemini-2.0-flash-lite')

const UNIFIED_PROMPT = (
  transcript: string,
  speakerRole: string,
  format: string
) => `You are an expert competitive debate judge evaluating a ${format} debate.

Speaker role: ${speakerRole}
Transcript:
"""
${transcript}
"""

Return ONLY a valid JSON object with exactly this structure, no markdown, no preamble:
{
  "analysis": {
    "structure_score": <1-10>,
    "logic_score": <1-10>,
    "rhetoric_score": <1-10>,
    "structure_feedback": "<2-3 sentences>",
    "logic_feedback": "<2-3 sentences>",
    "rhetoric_feedback": "<2-3 sentences>",
    "overall_feedback": "<3-4 sentences>",
    "key_strengths": ["<strength 1>", "<strength 2>"],
    "areas_for_improvement": ["<area 1>", "<area 2>"]
  },
  "ballot": {
    "decision": "<brief verdict>",
    "rfd": "<2-3 sentence reason for decision>",
    "rank": <integer>
  },
  "fact_checks": [
    {
      "claim": "<verbatim claim from speech>",
      "verdict": "accurate" | "inaccurate" | "unverifiable",
      "explanation": "<1 sentence>"
    }
  ]
}`

function cleanJsonResponse(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  return cleaned
}

function getDegradedResult(speakerRole: string): UnifiedAnalysis {
  return {
    analysis: {
      structure_score: 0,
      logic_score: 0,
      rhetoric_score: 0,
      structure_feedback: 'Analysis unavailable — AI quota exceeded. Please retry later.',
      logic_feedback: 'Analysis unavailable — AI quota exceeded. Please retry later.',
      rhetoric_feedback: 'Analysis unavailable — AI quota exceeded. Please retry later.',
      overall_feedback: `We were unable to analyze ${speakerRole}'s speech at this time due to AI service limits. Your transcript has been saved.`,
      key_strengths: [],
      areas_for_improvement: []
    },
    ballot: {
      decision: 'Pending',
      rfd: 'Ballot unavailable due to AI quota limits.',
      rank: 0
    },
    fact_checks: []
  }
}

export async function analyzeSpeaker(
  transcript: string,
  speakerRole: string,
  format: string,
  retries = 3
): Promise<UnifiedAnalysis> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const result = await generateTextWithFallback({
        model: MODEL,
        prompt: UNIFIED_PROMPT(transcript, speakerRole, format),
        temperature: 0.6
      })

      const text = cleanJsonResponse(result.text || '')
      return JSON.parse(text) as UnifiedAnalysis
    } catch (err: any) {
      const message = String(err?.message || '')
      const is429 = message.includes('429')
      const isQuota = /quota|limit|rate limit/i.test(message)

      if ((is429 || isQuota) && attempt < retries - 1) {
        const backoff = 1000 * Math.pow(2, attempt)
        console.warn(`Gemini quota hit, attempt ${attempt + 1}. Retrying in ${backoff}ms`, err)
        await new Promise((resolve) => setTimeout(resolve, backoff))
        continue
      }

      console.error(`Gemini unified analysis failed on attempt ${attempt + 1}/${retries}`, err)
      return getDegradedResult(speakerRole)
    }
  }

  return getDegradedResult(speakerRole)
}

export function mapUnifiedToLegacy(unified: UnifiedAnalysis) {
  const analysis = unified.analysis
  const ballot = unified.ballot

  const averageScore = Math.max(1, Math.round((analysis.structure_score + analysis.logic_score + analysis.rhetoric_score) / 3))
  const rankLabel = ballot.rank > 0 ? `${ballot.rank}${getRankSuffix(ballot.rank)}` : 'Pending'

  return {
    analysis: {
      scores: {
        structure: analysis.structure_score,
        logic: analysis.logic_score,
        rhetoric: analysis.rhetoric_score,
        rebuttal: averageScore,
        weighing: averageScore,
        overall: averageScore
      },
      structural_segments: [],
      arguments: [],
      tone: 'Analytical',
      archetype: 'Balanced Debater',
      coaching: {
        strengths: analysis.key_strengths,
        weaknesses: analysis.areas_for_improvement,
        drills: [],
        improvements: analysis.areas_for_improvement,
        stylistics: {
          pace: 'Unable to infer from transcript alone.',
          filler_words: 0,
          feedback: analysis.overall_feedback
        }
      },
      rfd_summary: analysis.overall_feedback
    },
    ballot: {
      speaker_score: 0,
      ranking: rankLabel,
      rfd: ballot.rfd,
      clash_evaluation: [],
      judge_persona: 'AI Judge'
    } as const,
    factChecks: unified.fact_checks.map((fc) => ({
      claim: fc.claim,
      verdict: fc.verdict,
      explanation: fc.explanation,
      confidence: 0,
      sources: []
    }))
  }
}

function getRankSuffix(rank: number) {
  if (rank % 100 >= 11 && rank % 100 <= 13) return 'th'
  switch (rank % 10) {
    case 1:
      return 'st'
    case 2:
      return 'nd'
    case 3:
      return 'rd'
    default:
      return 'th'
  }
}
