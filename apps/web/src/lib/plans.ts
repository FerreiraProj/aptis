/**
 * Pure plan helpers (no DB access) — safe to import anywhere and easy to test.
 */

import { PLAN_LIMITS, type PlanKey } from "./constants";

/**
 * Subscription statuses that grant access to the paid plan.
 *
 * PAST_DUE is included as a grace period while Stripe retries the payment.
 * When retries are exhausted Stripe moves the subscription to CANCELED/UNPAID,
 * which drops the user back to FREE.
 */
export const PAID_ACCESS_STATUSES = ["ACTIVE", "TRIALING", "PAST_DUE"] as const;

export type SubscriptionLike = {
  plan: string;
  status: string;
} | null | undefined;

/**
 * Resolve the plan a user is actually entitled to right now.
 * A subscription row that is canceled/unpaid/incomplete counts as FREE.
 */
export function resolveEffectivePlan(sub: SubscriptionLike): PlanKey {
  if (!sub) return "FREE";
  if (!(PAID_ACCESS_STATUSES as readonly string[]).includes(sub.status)) {
    return "FREE";
  }
  return sub.plan in PLAN_LIMITS ? (sub.plan as PlanKey) : "FREE";
}

/** Boolean feature flags defined in PLAN_LIMITS. */
export type PlanFeature = {
  [K in keyof (typeof PLAN_LIMITS)["FREE"]]: (typeof PLAN_LIMITS)["FREE"][K] extends boolean
    ? K
    : never;
}[keyof (typeof PLAN_LIMITS)["FREE"]];

export function hasFeature(plan: PlanKey, feature: PlanFeature): boolean {
  return PLAN_LIMITS[plan][feature] === true;
}

/** Monthly quota keys defined in PLAN_LIMITS. */
export type MonthlyQuota = "documentsPerMonth" | "chatMessagesPerMonth";

export function getMonthlyLimit(plan: PlanKey, quota: MonthlyQuota): number {
  return PLAN_LIMITS[plan][quota];
}

/** First instant of the current calendar month (UTC). */
export function startOfMonthUtc(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
