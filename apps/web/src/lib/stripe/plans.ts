import type { PlanTier } from "@aptis/database";

export interface PlanConfig {
  name: string;
  tier: PlanTier;
  priceMonthlyId: string;
  priceYearlyId?: string;
  priceMonthly: number; // EUR cents
  priceYearly?: number;
}

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
