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
    rebuttal_score?: number
    weighing_score?: number
    arguments?: Array<{
      claim: string
      mechanism: string
      impact: string
    }>
    drills?: string[]
    tone?: string
    archetype?: string
    stylistics?: {
      pace: string
      filler_words: number
      feedback: string
    }
  }
  ballot: {
    decision: string
    rfd: string
    rank: number
  }
  benchmark?: {
    elite_comparison: string
    percentile_estimate: number
    gap_analysis: string
  } | null
  fact_checks: Array<{
    claim: string
    verdict: 'accurate' | 'inaccurate' | 'unverifiable'
    explanation: string
  }>
}

export type ArgumentsAnalysis = {
  arguments: Array<{
    claim: string
    mechanism: string
    impact: string
  }>
  fact_checks: UnifiedAnalysis['fact_checks']
}

export type CoachingAnalysis = {
  drills: string[]
  benchmark: UnifiedAnalysis['benchmark']
}

const MODEL = google('gemini-2.0-flash-lite')

const CORE_PROMPT = (
  transcript: string,
  speakerRole: string,
  format: string,
  harshness: string
) => `You are an expert competitive debate judge evaluating a ${format} debate.

Speaker role: ${speakerRole}
Feedback strictness: ${harshness}
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
    "areas_for_improvement": ["<area 1>", "<area 2>"],
    "rebuttal_score": <1-10>,
    "weighing_score": <1-10>,
    "tone": "<dominant speaking tone>",
    "archetype": "<short debater archetype>",
    "stylistics": {
      "pace": "<brief pace assessment from transcript density and clarity>",
      "filler_words": <estimated count>,
      "feedback": "<2 sentence delivery coaching note>"
    }
  },
  "ballot": {
    "decision": "<brief verdict>",
    "rfd": "<2-3 sentence reason for decision>",
    "rank": <integer>
  }
}`

const ARGUMENTS_PROMPT = (
  transcript: string,
  speakerRole: string,
  format: string,
  harshness: string
) => `You are an expert competitive debate judge extracting argument-level feedback from a ${format} debate speech.

Speaker role: ${speakerRole}
Feedback strictness: ${harshness}
Transcript:
"""
${transcript}
"""

Return ONLY a valid JSON object with exactly this structure, no markdown, no preamble:
{
  "arguments": [
    {
      "claim": "<main claim from the speech>",
      "mechanism": "<how the speaker says the claim works>",
      "impact": "<why the claim matters in the debate>"
    }
  ],
  "fact_checks": [
    {
      "claim": "<verbatim factual claim from speech>",
      "verdict": "accurate" | "inaccurate" | "unverifiable",
      "explanation": "<1 sentence>"
    }
  ]
}`

const COACHING_PROMPT = (
  transcript: string,
  speakerRole: string,
  format: string,
  harshness: string
) => `You are an elite debate coach creating follow-up coaching for a ${format} debate speech.

Speaker role: ${speakerRole}
Feedback strictness: ${harshness}
Transcript:
"""
${transcript}
"""

Return ONLY a valid JSON object with exactly this structure, no markdown, no preamble:
{
  "drills": ["<specific practice drill 1>", "<specific practice drill 2>", "<specific practice drill 3>"],
  "benchmark": {
    "elite_comparison": "<2-3 sentence comparison against an elite debate standard>",
    "percentile_estimate": <0-100>,
    "gap_analysis": "<specific gap separating this speech from top-tier execution>"
  }
}`

const UNIFIED_PROMPT = (
  transcript: string,
  speakerRole: string,
  format: string,
  harshness: string
) => `You are an expert competitive debate judge evaluating a ${format} debate.

Speaker role: ${speakerRole}
Feedback strictness: ${harshness}
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
    "areas_for_improvement": ["<area 1>", "<area 2>"],
    "rebuttal_score": <1-10>,
    "weighing_score": <1-10>,
    "arguments": [
      {
        "claim": "<main claim from the speech>",
        "mechanism": "<how the speaker says the claim works>",
        "impact": "<why the claim matters in the debate>"
      }
    ],
    "drills": ["<specific practice drill 1>", "<specific practice drill 2>", "<specific practice drill 3>"],
    "tone": "<dominant speaking tone>",
    "archetype": "<short debater archetype>",
    "stylistics": {
      "pace": "<brief pace assessment from transcript density and clarity>",
      "filler_words": <estimated count>,
      "feedback": "<2 sentence delivery coaching note>"
    }
  },
  "ballot": {
    "decision": "<brief verdict>",
    "rfd": "<2-3 sentence reason for decision>",
    "rank": <integer>
  },
  "benchmark": {
    "elite_comparison": "<2-3 sentence comparison against an elite debate standard>",
    "percentile_estimate": <0-100>,
    "gap_analysis": "<specific gap separating this speech from top-tier execution>"
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

  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')

  if (start === -1 || end === -1 || end <= start) {
    return cleaned
  }

  return cleaned.slice(start, end + 1)
}

function compactTranscript(transcript: string, maxChars = 12000) {
  const normalized = transcript.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxChars) return normalized

  const headLength = Math.floor(maxChars * 0.7)
  const tailLength = maxChars - headLength
  return `${normalized.slice(0, headLength)}\n\n[Transcript shortened to reduce AI quota usage]\n\n${normalized.slice(-tailLength)}`
}

function getDegradedResult(speakerRole: string): UnifiedAnalysis {
  return {
    analysis: {
      structure_score: 1,
      logic_score: 1,
      rhetoric_score: 1,
      structure_feedback: 'Analysis unavailable — AI quota exceeded. Please retry later.',
      logic_feedback: 'Analysis unavailable — AI quota exceeded. Please retry later.',
      rhetoric_feedback: 'Analysis unavailable — AI quota exceeded. Please retry later.',
      overall_feedback: `We were unable to analyze ${speakerRole}'s speech at this time due to AI service limits. Your transcript has been saved.`,
      key_strengths: [],
      areas_for_improvement: [],
      arguments: [],
      drills: [],
      tone: 'Unavailable',
      archetype: 'Pending Analysis',
      stylistics: {
        pace: 'Unavailable',
        filler_words: 0,
        feedback: `We were unable to analyze ${speakerRole}'s speech at this time due to AI service limits. Your transcript has been saved.`
      }
    },
    ballot: {
      decision: 'Pending',
      rfd: 'Ballot unavailable due to AI quota limits.',
      rank: 0
    },
    benchmark: null,
    fact_checks: []
  }
}

async function generateJsonWithRetries<T>(
  prompt: string,
  retries: number,
  fallback: T
): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const result = await generateTextWithFallback({
        model: MODEL,
        prompt,
        temperature: 0.5,
        allowQuotaFallback: false
      })

      const text = cleanJsonResponse(result.text || '')
      return JSON.parse(text) as T
    } catch (err: any) {
      const message = String(err?.message || '')
      const is429 = message.includes('429')
      const isQuota = /quota|limit|rate limit/i.test(message)

      if (attempt < retries - 1) {
        const backoff = (is429 || isQuota)
          ? 1000 * Math.pow(2, attempt)
          : 500 * (attempt + 1)
        console.warn(`Gemini section generation failed on attempt ${attempt + 1}. Retrying in ${backoff}ms`, err)
        await new Promise((resolve) => setTimeout(resolve, backoff))
        continue
      }

      console.error(`Gemini section generation failed on attempt ${attempt + 1}/${retries}`, err)
      return fallback
    }
  }

  return fallback
}

export async function analyzeSpeakerCore(
  transcript: string,
  speakerRole: string,
  format: string,
  options: {
    harshness?: string
    retries?: number
  } = {}
): Promise<UnifiedAnalysis> {
  const retries = options.retries ?? 3
  const harshness = options.harshness ?? 'Standard'

  const core = await generateJsonWithRetries<Pick<UnifiedAnalysis, 'analysis' | 'ballot'>>(
    CORE_PROMPT(compactTranscript(transcript, 14000), speakerRole, format, harshness),
    retries,
    getDegradedResult(speakerRole)
  )

  return {
    ...core,
    benchmark: null,
    fact_checks: [],
    analysis: {
      ...core.analysis,
      arguments: core.analysis.arguments ?? [],
      drills: core.analysis.drills ?? []
    }
  }
}

export async function analyzeSpeakerArguments(
  transcript: string,
  speakerRole: string,
  format: string,
  options: {
    harshness?: string
    retries?: number
  } = {}
): Promise<ArgumentsAnalysis> {
  const retries = options.retries ?? 2
  const harshness = options.harshness ?? 'Standard'

  return generateJsonWithRetries<ArgumentsAnalysis>(
    ARGUMENTS_PROMPT(compactTranscript(transcript, 10000), speakerRole, format, harshness),
    retries,
    { arguments: [], fact_checks: [] }
  )
}

export async function analyzeSpeakerCoaching(
  transcript: string,
  speakerRole: string,
  format: string,
  options: {
    harshness?: string
    retries?: number
  } = {}
): Promise<CoachingAnalysis> {
  const retries = options.retries ?? 2
  const harshness = options.harshness ?? 'Standard'

  return generateJsonWithRetries<CoachingAnalysis>(
    COACHING_PROMPT(compactTranscript(transcript, 7000), speakerRole, format, harshness),
    retries,
    { drills: [], benchmark: null }
  )
}

export async function analyzeSpeaker(
  transcript: string,
  speakerRole: string,
  format: string,
  options: {
    harshness?: string
    retries?: number
  } = {}
): Promise<UnifiedAnalysis> {
  const retries = options.retries ?? 3
  const harshness = options.harshness ?? 'Standard'

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const result = await generateTextWithFallback({
        model: MODEL,
        prompt: UNIFIED_PROMPT(compactTranscript(transcript, 14000), speakerRole, format, harshness),
        temperature: 0.6,
        allowQuotaFallback: false
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

      if (attempt < retries - 1) {
        const backoff = 500 * (attempt + 1)
        console.warn(`Gemini unified analysis failed on attempt ${attempt + 1}. Retrying in ${backoff}ms`, err)
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
  const rebuttalScore = analysis.rebuttal_score ?? averageScore
  const weighingScore = analysis.weighing_score ?? averageScore
  const rankLabel = ballot.rank > 0 ? `${ballot.rank}${getRankSuffix(ballot.rank)}` : 'Pending'

  return {
    analysis: {
      scores: {
        structure: analysis.structure_score,
        logic: analysis.logic_score,
        rhetoric: analysis.rhetoric_score,
        rebuttal: rebuttalScore,
        weighing: weighingScore,
        overall: averageScore
      },
      structural_segments: [],
      arguments: analysis.arguments ?? [],
      tone: analysis.tone ?? 'Analytical',
      archetype: analysis.archetype ?? 'Balanced Debater',
      coaching: {
        strengths: analysis.key_strengths,
        weaknesses: analysis.areas_for_improvement,
        drills: analysis.drills ?? [],
        improvements: analysis.areas_for_improvement,
        stylistics: analysis.stylistics ?? {
          pace: 'Unable to infer from transcript alone.',
          filler_words: 0,
          feedback: analysis.overall_feedback
        }
      },
      rfd_summary: analysis.overall_feedback
    },
    ballot: {
      speaker_score: averageScore,
      ranking: rankLabel,
      rfd: ballot.rfd,
      clash_evaluation: [],
      judge_persona: 'AI Judge'
    } as const,
    benchmark: unified.benchmark
      ? {
          elite_comparison: unified.benchmark.elite_comparison,
          percentile_estimate: unified.benchmark.percentile_estimate,
          gap_analysis: unified.benchmark.gap_analysis
        }
      : null,
    factChecks: (unified.fact_checks ?? []).map((fc) => ({
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
