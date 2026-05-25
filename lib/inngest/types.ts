import { z } from 'zod'

export const analysisRequestSchema = z.object({
  sessionId: z.string().min(1),
  harshness: z.enum(['Gentle', 'Standard', 'Ruthless']).default('Standard')
})

export type AnalysisRequest = z.infer<typeof analysisRequestSchema>

export const analysisEventSchema = z.object({
  sessionId: z.string().min(1),
  userId: z.string().min(1),
  harshness: z.enum(['Gentle', 'Standard', 'Ruthless']).default('Standard')
})

export type AnalysisEventData = z.infer<typeof analysisEventSchema>

export const analysisResponseSchema = z.object({
  success: z.literal(true),
  queued: z.literal(true)
})

export type AnalysisResponse = z.infer<typeof analysisResponseSchema>
