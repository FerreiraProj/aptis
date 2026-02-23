import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Only initialize Redis if env vars are set (allows dev without Redis)
function createRedis() {
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return null;
  }
  return Redis.fromEnv();
}

const redis = createRedis();

function createLimiter(
  requests: number,
  window: string,
  prefix: string
): Ratelimit | null {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window as Parameters<typeof Ratelimit.slidingWindow>[1]),
    prefix,
  });
}

// Different rate limiters per feature
export const rateLimiters = {
  // Document upload: 10/hour
  upload: createLimiter(10, "1 h", "rl:upload"),
  // AI generation (flashcards, quizzes): 30/hour
  generate: createLimiter(30, "1 h", "rl:generate"),
  // Chat messages: 50/hour
  chat: createLimiter(50, "1 h", "rl:chat"),
  // General API: 200/minute
  api: createLimiter(200, "1 m", "rl:api"),
};

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

export async function checkRateLimit(
  limiterKey: keyof typeof rateLimiters,
  identifier: string
): Promise<RateLimitResult> {
  const limiter = rateLimiters[limiterKey];

  // If Redis not configured, allow all requests (dev mode)
  if (!limiter) {
    return { success: true, remaining: 999, reset: 0 };
  }

  const result = await limiter.limit(identifier);
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}
