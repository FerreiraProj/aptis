/**
 * Rate limiting via Upstash Redis + @upstash/ratelimit.
 *
 * Limits are loaded from the `rate_limit_configs` DB table (editable in admin).
 * Falls back to PLAN_RATE_LIMITS from constants.ts when:
 *   - DB is unavailable
 *   - UPSTASH_REDIS_REST_URL / TOKEN are not configured (local dev)
 *   - Redis is temporarily unreachable (fail open, never block users)
 *   - isUnlimited = true (INSTITUTIONAL or admin-set)
 *
 * DB configs are cached in-process for 5 minutes to avoid a DB hit on every request.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { PLAN_RATE_LIMITS, type PlanKey, type RateLimitAction } from "./constants";
import { resolveUserPlan, userPlanSelect } from "./plans";

// ─── Types ────────────────────────────────────────────────────────────────────

export type { RateLimitAction };

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  reset: number; // Unix timestamp (ms) when the window resets
};

type RateLimitEntry = { requests: number; window: string } | null; // null = unlimited
type RateLimitConfigMap = Record<string, RateLimitEntry>; // key = "PLAN:action"

// ─── Redis client (lazy singleton) ───────────────────────────────────────────

let _redis: Redis | null | undefined; // undefined = not yet initialised

function getRedis(): Redis | null {
  if (_redis !== undefined) return _redis;

  const url = process.env.UPSTASH_REDIS_REST_URL ?? "";
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? "";

  if (!url || url === "https://" || !token) {
    console.info("[rate-limit] Upstash not configured — rate limiting disabled");
    _redis = null;
    return null;
  }

  try {
    _redis = new Redis({ url, token });
  } catch {
    console.warn("[rate-limit] Failed to create Redis client — rate limiting disabled");
    _redis = null;
  }

  return _redis;
}

// ─── DB config cache (5-minute TTL) ──────────────────────────────────────────

const CONFIG_TTL_MS = 5 * 60 * 1000;
let _configCache: { data: RateLimitConfigMap; expiresAt: number } | null = null;

async function getRateLimitConfigs(): Promise<RateLimitConfigMap> {
  const now = Date.now();
  if (_configCache && now < _configCache.expiresAt) {
    return _configCache.data;
  }

  try {
    const { prisma } = await import("@aptis/database");
    const rows = await prisma.rateLimitConfig.findMany();

    const data: RateLimitConfigMap = {};
    for (const row of rows) {
      data[`${row.plan}:${row.action}`] = row.isUnlimited
        ? null
        : { requests: row.requests, window: row.window };
    }

    _configCache = { data, expiresAt: now + CONFIG_TTL_MS };
    return data;
  } catch {
    console.warn("[rate-limit] DB unavailable — falling back to constants");
    const data: RateLimitConfigMap = {};
    for (const [plan, limits] of Object.entries(PLAN_RATE_LIMITS)) {
      for (const [action, config] of Object.entries(limits)) {
        data[`${plan}:${action}`] = config as RateLimitEntry;
      }
    }
    return data;
  }
}

// ─── Limiter cache (keyed by "action:plan:requests:window") ──────────────────
// Including requests+window in the key means config changes auto-create new limiters.

const _limiters = new Map<string, Ratelimit>();

async function getLimiter(
  action: RateLimitAction,
  plan: PlanKey
): Promise<Ratelimit | null> {
  const redis = getRedis();
  if (!redis) return null;

  const configs = await getRateLimitConfigs();
  const entry = configs[`${plan}:${action}`];

  if (entry === undefined) {
    // Not in DB — use constants fallback
    const fallback = PLAN_RATE_LIMITS[plan]?.[action];
    if (!fallback) return null;
    const cacheKey = `${action}:${plan}:${fallback.requests}:${fallback.window}`;
    if (_limiters.has(cacheKey)) return _limiters.get(cacheKey)!;
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        fallback.requests,
        fallback.window as Parameters<typeof Ratelimit.slidingWindow>[1]
      ),
      prefix: `aptis:rl:${action}:${plan}`,
      analytics: false,
    });
    _limiters.set(cacheKey, limiter);
    return limiter;
  }

  if (entry === null) return null; // unlimited

  const cacheKey = `${action}:${plan}:${entry.requests}:${entry.window}`;
  if (_limiters.has(cacheKey)) return _limiters.get(cacheKey)!;

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(
      entry.requests,
      entry.window as Parameters<typeof Ratelimit.slidingWindow>[1]
    ),
    prefix: `aptis:rl:${action}:${plan}`,
    analytics: false,
  });

  _limiters.set(cacheKey, limiter);
  return limiter;
}

// ─── Plan lookup helper ───────────────────────────────────────────────────────

/**
 * Fetch the plan the user is currently entitled to.
 * An active admin grant wins; otherwise returns "FREE" when there is no
 * subscription or it is no longer active — see resolveUserPlan.
 */
export async function getUserPlan(userId: string): Promise<PlanKey> {
  const { prisma } = await import("@aptis/database");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userPlanSelect,
  });
  return resolveUserPlan(user);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Check rate limit for a given action + user.
 */
export async function checkRateLimit(
  action: RateLimitAction,
  userId: string,
  plan: PlanKey = "FREE"
): Promise<RateLimitResult> {
  const limiter = await getLimiter(action, plan);

  if (!limiter) {
    return { success: true, remaining: Infinity, reset: 0 };
  }

  try {
    const result = await limiter.limit(userId);
    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (err) {
    console.error("[rate-limit] Redis error — allowing request:", err);
    return { success: true, remaining: 0, reset: 0 };
  }
}

/**
 * Invalidate the DB config cache immediately.
 * Called after admin updates rate limit configs.
 */
export function invalidateRateLimitCache() {
  _configCache = null;
  _limiters.clear();
}
