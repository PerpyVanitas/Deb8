import { GoogleGenerativeAI } from '@google/generative-ai'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function generateOpponentRebuttal({
  transcript,
  motion,
  persona,
  role,
  format
}: {
  transcript: string,
  motion: string,
  persona: string,
  role?: string,
  format?: string
}) {
  let personaPrompt = ''
  switch (persona) {
    case 'aggressive':
      personaPrompt = "You are the 'Aggressive Debater'. You aggressively attack the opponent's core mechanisms. You do not just disagree; you systematically dismantle their logic with high energy and sharp rhetoric."
      break
    case 'technical':
      personaPrompt = "You are the 'Technical Logician'. You speak like an economics major. You exploit logical gaps, missing links, and internal contradictions in the opponent's speech. You use terms like 'marginal benefit' and 'mutually exclusive'."
      break
    case 'persuasive':
      personaPrompt = "You are the 'Persuasive Narrative Debater'. You focus heavily on the real-world impact and framing. You reframe the debate around vulnerable stakeholders and use emotional, compelling storytelling."
      break
    case 'trap_setter':
      personaPrompt = "You are the 'Strategic Trap Setter'. You concede minor points to win the core clash. You are highly strategic, focusing only on the single most important weighing metric in the debate."
      break
    default:
      personaPrompt = "You are an elite competitive debater responding to an opponent."
  }

  // Phase 3: Bo Seo Benchmark / Human Error Simulation
  // We want the AI to be realistic, not flawless.
  const fallibilityPrompt = `
CRITICAL INSTRUCTION: You are an elite HUMAN debater, not an omniscient AI. You must simulate realistic human limitations.
- Occasionally drop (ignore) a minor sub-point the user made.
- Do not compute infinite facts. Rely on standard, well-known debate examples.
- Focus your rebuttal on their 1 or 2 strongest points, rather than a robotic point-by-point flawless refutation.
`

  const model = genai.getGenerativeModel({ 
    model: 'gemini-2.0-flash',
    systemInstruction: personaPrompt + '\n' + fallibilityPrompt
  })

  const prompt = `The debate format is: ${format || 'Free Sparring'}.
The motion is: "${motion}".
The opponent's role was: ${role || 'Speaker'}.
(Therefore, you are giving the subsequent speech from the opposite side.)

Here is your opponent's latest speech transcript:
"${transcript}"

Write your rebuttal speech. It should be approximately 3-4 paragraphs (about 2 minutes spoken). 
Speak directly to the opponent and the judge. Do NOT use markdown or special formatting. Just pure spoken text so it can be read aloud by a Text-to-Speech engine.`

  try {
    const result = await model.generateContent(prompt)
    return result.response.text().trim()
  } catch (err) {
    console.error("Opponent generation error:", err)
    throw new Error("Failed to generate AI rebuttal")
  }
}
