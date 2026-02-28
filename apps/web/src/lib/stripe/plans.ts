import type { PlanTier } from "@aptis/database";

// ─── Static fallback config (used when DB is unavailable) ────────────────────

export interface PlanConfig {
  name: string;
  tier: PlanTier;
  priceMonthlyId: string;
  priceYearlyId?: string;
  priceMonthly: number; // EUR cents
  priceYearly?: number;
}

/** Static fallback — reads Stripe price IDs from env vars */
export const PLANS: Record<Exclude<PlanTier, "FREE">, PlanConfig> = {
  PRO: {
    name: "Pro",
    tier: "PRO",
    priceMonthlyId: process.env.STRIPE_PRICE_ID_PRO_MONTHLY || "",
    priceYearlyId: process.env.STRIPE_PRICE_ID_PRO_YEARLY,
    priceMonthly: 1500, // €15.00
    priceYearly: 14400, // €144.00 (€12/month)
  },
  PREMIUM: {
    name: "Premium",
    tier: "PREMIUM",
    priceMonthlyId: process.env.STRIPE_PRICE_ID_PREMIUM_MONTHLY || "",
    priceYearlyId: process.env.STRIPE_PRICE_ID_PREMIUM_YEARLY,
    priceMonthly: 2900, // €29.00
    priceYearly: 27600, // €276.00 (€23/month)
  },
  INSTITUTIONAL: {
    name: "Institucional",
    tier: "INSTITUTIONAL",
    priceMonthlyId: "", // custom pricing
    priceMonthly: 0, // negotiable
  },
};

/** Static fallback for webhook — maps Stripe price ID → PlanTier */
export function getPlanFromPriceId(priceId: string): PlanTier {
  for (const plan of Object.values(PLANS)) {
    if (
      plan.priceMonthlyId === priceId ||
      plan.priceYearlyId === priceId
    ) {
      return plan.tier;
    }
  }
  return "FREE";
}

// ─── DB-backed lookup (with 5-minute TTL cache) ───────────────────────────────

const PLAN_CONFIG_TTL_MS = 5 * 60 * 1000;
let _planConfigCache: {
  data: Record<string, { stripePriceIdMonthly: string | null; stripePriceIdYearly: string | null }>;
  priceIdMap: Record<string, PlanTier>;
  expiresAt: number;
} | null = null;

async function getPlanConfigsFromDB() {
  const now = Date.now();
  if (_planConfigCache && now < _planConfigCache.expiresAt) {
    return _planConfigCache;
  }

  try {
    const { prisma } = await import("@aptis/database");
    const rows = await prisma.planConfig.findMany();

    const data: Record<string, { stripePriceIdMonthly: string | null; stripePriceIdYearly: string | null }> = {};
    const priceIdMap: Record<string, PlanTier> = {};

    for (const row of rows) {
      data[row.plan] = {
        stripePriceIdMonthly: row.stripePriceIdMonthly,
        stripePriceIdYearly: row.stripePriceIdYearly,
      };
      if (row.stripePriceIdMonthly) priceIdMap[row.stripePriceIdMonthly] = row.plan;
      if (row.stripePriceIdYearly) priceIdMap[row.stripePriceIdYearly] = row.plan;
    }

    _planConfigCache = { data, priceIdMap, expiresAt: now + PLAN_CONFIG_TTL_MS };
    return _planConfigCache;
  } catch {
    console.warn("[stripe/plans] DB unavailable — using env var fallback");
    return null;
  }
}

/**
 * Get the Stripe price ID for a given plan tier + interval.
 * Reads from DB (with cache); falls back to env vars.
 */
export async function getStripePriceId(
  planTier: Exclude<PlanTier, "FREE">,
  interval: "monthly" | "yearly"
): Promise<string | null> {
  const cache = await getPlanConfigsFromDB();

  if (cache) {
    const config = cache.data[planTier];
    if (config) {
      return interval === "yearly"
        ? (config.stripePriceIdYearly ?? config.stripePriceIdMonthly)
        : config.stripePriceIdMonthly;
    }
  }

  // Fallback to env vars
  const plan = PLANS[planTier];
  return interval === "yearly"
    ? (plan.priceYearlyId ?? plan.priceMonthlyId)
    : plan.priceMonthlyId;
}

/**
 * Map a Stripe price ID to a PlanTier.
 * Used in the webhook handler. Reads from DB cache; falls back to static PLANS.
 */
export async function getPlanFromPriceIdDB(priceId: string): Promise<PlanTier> {
  const cache = await getPlanConfigsFromDB();
  if (cache?.priceIdMap[priceId]) {
    return cache.priceIdMap[priceId];
  }
  // Fallback to static map
  return getPlanFromPriceId(priceId);
}

/**
 * Invalidate plan config cache (call after admin updates a plan).
 */
export function invalidatePlanConfigCache() {
  _planConfigCache = null;
}
