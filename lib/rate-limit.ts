import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const hasRedis = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)

const dummyRatelimit = {
  limit: async () => ({ success: true, limit: 10, remaining: 9, reset: 0 }),
} as unknown as Ratelimit

// Standard AI Pipeline: 10 requests per 10 seconds (per user/IP)
export const aiRateLimit = hasRedis ? new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  analytics: true,
  prefix: "@deb8/ai-ratelimit",
}) : dummyRatelimit;

// Global Gemini free-tier cap: 15 requests per 60 seconds across all Gemini calls
export const geminiRateLimit = hasRedis ? new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(15, "60 s"),
  analytics: true,
  prefix: "@deb8/gemini-ratelimit",
}) : dummyRatelimit;

// Transcription requires more compute/cost: 5 requests per 60 seconds
export const transcriptionRateLimit = hasRedis ? new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  analytics: true,
  prefix: "@deb8/transcription-ratelimit",
}) : dummyRatelimit;
