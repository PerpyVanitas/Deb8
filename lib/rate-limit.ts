import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const hasRedis = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)

function createMemoryRatelimit(limit: number, windowMs: number) {
  const buckets = new Map<string, number[]>()

  return {
    limit: async (key = 'global') => {
      const now = Date.now()
      const recent = (buckets.get(key) || []).filter((time) => now - time < windowMs)
      const reset = recent.length > 0 ? recent[0] + windowMs : now + windowMs

      if (recent.length >= limit) {
        buckets.set(key, recent)
        return { success: false, limit, remaining: 0, reset }
      }

      recent.push(now)
      buckets.set(key, recent)
      return { success: true, limit, remaining: Math.max(0, limit - recent.length), reset }
    },
  } as unknown as Ratelimit
}

const aiMemoryRatelimit = createMemoryRatelimit(6, 10_000)
const geminiMemoryRatelimit = createMemoryRatelimit(8, 60_000)
const transcriptionMemoryRatelimit = createMemoryRatelimit(3, 60_000)

// Standard AI Pipeline: 10 requests per 10 seconds (per user/IP)
export const aiRateLimit = hasRedis ? new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(6, "10 s"),
  analytics: true,
  prefix: "@deb8/ai-ratelimit",
}) : aiMemoryRatelimit;

// Conservative single-user Gemini cap. Stay below free-tier RPM to leave room for retries.
export const geminiRateLimit = hasRedis ? new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(8, "60 s"),
  analytics: true,
  prefix: "@deb8/gemini-ratelimit",
}) : geminiMemoryRatelimit;

// Transcription requires more compute/cost: 5 requests per 60 seconds
export const transcriptionRateLimit = hasRedis ? new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(3, "60 s"),
  analytics: true,
  prefix: "@deb8/transcription-ratelimit",
}) : transcriptionMemoryRatelimit;
