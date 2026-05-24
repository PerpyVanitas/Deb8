import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Define strict rate limits for AI endpoints to prevent abuse and quota exhaustion

// Standard AI Pipeline: 10 requests per 10 seconds (per user/IP)
export const aiRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  analytics: true,
  prefix: "@deb8/ai-ratelimit",
});

// Transcription requires more compute/cost: 5 requests per 60 seconds
export const transcriptionRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  analytics: true,
  prefix: "@deb8/transcription-ratelimit",
});
