/**
 * Server-side plan enforcement: monthly quotas and feature gates.
 *
 * Usage is counted from the `usage_events` table (not from documents/messages),
 * so deleting a document or conversation does not give the quota back.
 */

import { NextResponse } from "next/server";
import { prisma } from "@aptis/database";
import type { UsageEventKind } from "@aptis/database";
import type { PlanKey } from "./constants";
import {
  getMonthlyLimit,
  hasFeature,
  startOfMonthUtc,
  type MonthlyQuota,
  type PlanFeature,
} from "./plans";

const QUOTA_EVENT: Record<MonthlyQuota, UsageEventKind> = {
  documentsPerMonth: "DOCUMENT_UPLOAD",
  chatMessagesPerMonth: "CHAT_MESSAGE",
};

/** Machine-readable codes the client maps to translated messages. */
export const PLAN_ERROR_CODES = {
  documentsPerMonth: "PLAN_LIMIT_DOCUMENTS",
  chatMessagesPerMonth: "PLAN_LIMIT_CHAT",
  feature: "PLAN_FEATURE_LOCKED",
} as const;

export type QuotaCheck = {
  allowed: boolean;
  used: number;
  limit: number;
};

export async function checkMonthlyQuota(
  userId: string,
  plan: PlanKey,
  quota: MonthlyQuota
): Promise<QuotaCheck> {
  const limit = getMonthlyLimit(plan, quota);
  if (limit === Infinity) return { allowed: true, used: 0, limit };

  const used = await prisma.usageEvent.count({
    where: {
      userId,
      kind: QUOTA_EVENT[quota],
      createdAt: { gte: startOfMonthUtc() },
    },
  });

  return { allowed: used < limit, used, limit };
}

export async function recordUsage(
  userId: string,
  quota: MonthlyQuota
): Promise<void> {
  await prisma.usageEvent.create({
    data: { userId, kind: QUOTA_EVENT[quota] },
  });
}

/** 403 response for an exhausted monthly quota. */
export function quotaExceededResponse(
  quota: MonthlyQuota,
  check: QuotaCheck
): NextResponse {
  return NextResponse.json(
    {
      error: `Monthly plan limit reached (${check.used}/${check.limit}). Upgrade to continue.`,
      code: PLAN_ERROR_CODES[quota],
      used: check.used,
      limit: check.limit,
    },
    { status: 403 }
  );
}

/** Returns a 403 response if the plan lacks the feature, otherwise null. */
export function requireFeature(
  plan: PlanKey,
  feature: PlanFeature
): NextResponse | null {
  if (hasFeature(plan, feature)) return null;
  return NextResponse.json(
    {
      error: "This feature is not available on your current plan.",
      code: PLAN_ERROR_CODES.feature,
      feature,
    },
    { status: 403 }
  );
}
