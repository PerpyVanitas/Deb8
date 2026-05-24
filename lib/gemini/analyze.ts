import { GoogleGenerativeAI } from '@google/generative-ai'
import { z } from 'zod'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const AnalysisSchema = z.object({
  scores: z.object({
    structure: z.number().min(1).max(10),
    logic: z.number().min(1).max(10),
    rhetoric: z.number().min(1).max(10),
    rebuttal: z.number().min(1).max(10),
    weighing: z.number().min(1).max(10),
    overall: z.number().min(1).max(10),
  }),
  structural_segments: z.array(z.object({
    segment_type: z.enum(['intro', 'framing', 'rebuttal', 'argument', 'weighing', 'conclusion']),
    text_snippet: z.string(),
    quality_rating: z.enum(['poor', 'average', 'excellent'])
  })),
  arguments: z.array(z.object({
    claim: z.string(),
    mechanism: z.string(),
    impact: z.string()
  })),
  tone: z.string(),
  archetype: z.string(),
  coaching: z.object({
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    drills: z.array(z.string()),
    improvements: z.array(z.string())
  }),
  rfd_summary: z.string()
})

export async function analyzeDebateSpeech({ 
  transcript, 
  motion, 
  role, 
  wordCount 
}: { 
  transcript: string, 
  motion: string, 
  role: string, 
  wordCount: number 
}) {
  const model = genai.getGenerativeModel({ 
    model: 'gemini-2.0-flash',
    systemInstruction: `You are an elite competitive debate coach and adjudicator. Analyze the provided speech transcript.
The debater is speaking on the motion: "${motion}"
Their role is: ${role}.

Return a structured JSON object containing:
- scores: { structure: 1-10, logic: 1-10, rhetoric: 1-10, rebuttal: 1-10, weighing: 1-10, overall: 1-10 }
- structural_segments: array of { segment_type: 'intro'|'framing'|'rebuttal'|'argument'|'weighing'|'conclusion', text_snippet: string, quality_rating: 'poor'|'average'|'excellent' }
- arguments: array of { claim: string, mechanism: string, impact: string }
- tone: string (e.g. 'Aggressive', 'Analytical', 'Persuasive', 'Defensive')
- archetype: string (e.g. 'The Technical Logician', 'The Storyteller', 'The Brawler')
- coaching: { strengths: string[], weaknesses: string[], drills: string[], improvements: string[] }
- rfd_summary: 2-3 sentence adjudicator Reason for Decision

IMPORTANT: Return ONLY raw JSON without markdown formatting (\`\`\`json) or any additional text.` 
  })

  const prompt = `Analyze this speech transcript (${wordCount} words):\n\n${transcript}`

  const result = await model.generateContent(prompt)
  let text = result.response.text().trim()
  
  if (text.startsWith('```json')) {
    text = text.replace(/^```json/, '').replace(/```$/, '').trim()
  }

  try {
    const parsed = JSON.parse(text)
    return AnalysisSchema.parse(parsed)
  } catch (err) {
    console.error("Failed to parse Gemini response:", text, err)
    throw new Error("Failed to parse AI analysis.")
  }
}

const BallotSchema = z.object({
  speaker_score: z.number().min(60).max(100),
  ranking: z.string(),
  rfd: z.string(),
  clash_evaluation: z.array(z.object({
    issue: z.string(),
    winner: z.string(),
    reason: z.string()
  })),
  judge_persona: z.string()
})

export async function generateBallot({ 
  transcript, 
  motion, 
  role 
}: { 
  transcript: string, 
  motion: string, 
  role: string 
}) {
  const model = genai.getGenerativeModel({ 
    model: 'gemini-2.0-flash',
    systemInstruction: `You are an expert debate judge with a 'technical' persona.
The debater is speaking on the motion: "${motion}"
Their role is: ${role}.

Evaluate the speech and return a structured JSON object containing:
- speaker_score: integer (between 60 and 100, standard BP speaker scale)
- ranking: string (e.g., '1st', '2nd', '3rd', '4th')
- rfd: string (Reason for Decision - detailed paragraph)
- clash_evaluation: array of { issue: string, winner: string, reason: string }
- judge_persona: 'technical'

IMPORTANT: Return ONLY raw JSON without markdown formatting (\`\`\`json) or any additional text.` 
  })

  const prompt = `Evaluate this speech transcript:\n\n${transcript}`

  const result = await model.generateContent(prompt)
  let text = result.response.text().trim()
  
  if (text.startsWith('```json')) {
    text = text.replace(/^```json/, '').replace(/```$/, '').trim()
  }

  try {
    const parsed = JSON.parse(text)
    return BallotSchema.parse(parsed)
  } catch (err) {
    console.error("Failed to parse Gemini ballot response:", text, err)
    throw new Error("Failed to parse AI ballot.")
  }
}

const FactChecksSchema = z.object({
  checks: z.array(z.object({
    claim: z.string(),
    verdict: z.enum(['True', 'False', 'Misleading', 'Unverifiable']),
    confidence: z.number().min(0).max(100),
    explanation: z.string(),
    sources: z.array(z.string())
  }))
})

export async function generateFactChecks({ 
  transcript, 
  motion 
}: { 
  transcript: string, 
  motion: string 
}) {
  const model = genai.getGenerativeModel({ 
    model: 'gemini-2.0-flash',
    systemInstruction: `You are an elite fact-checker for a debate platform.
The debater is speaking on the motion: "${motion}".

Analyze the transcript for factual claims, especially empirical data, historical events, or statistics.
Return a structured JSON object containing an array 'checks' with each object:
- claim: string (the claim made in the speech)
- verdict: 'True' | 'False' | 'Misleading' | 'Unverifiable'
- confidence: integer (0 to 100)
- explanation: string (why the verdict was given)
- sources: array of strings (potential sources or facts that prove/disprove it)

IMPORTANT: Return ONLY raw JSON without markdown formatting (\`\`\`json) or any additional text.` 
  })

  const prompt = `Fact-check this speech transcript:\n\n${transcript}`

  const result = await model.generateContent(prompt)
  let text = result.response.text().trim()
  
  if (text.startsWith('```json')) {
    text = text.replace(/^```json/, '').replace(/```$/, '').trim()
  }

  try {
    const parsed = JSON.parse(text)
    const result = FactChecksSchema.parse(parsed)
    return result.checks
  } catch (err) {
    console.error("Failed to parse Gemini fact check response:", text, err)
    return []
  }
}
