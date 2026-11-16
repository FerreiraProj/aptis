import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@aptis/database";
import { requireAdmin, isAuthError } from "@/lib/auth/guards";
import { invalidateRateLimitCache } from "@/lib/rate-limit";
import { PLAN_RATE_LIMITS } from "@/lib/constants";
import type { PlanTier } from "@aptis/database";

const PLANS: PlanTier[] = ["FREE", "PRO", "PREMIUM", "INSTITUTIONAL"];
const ACTIONS = ["generate", "chat", "upload", "studyPlan", "grade"] as const;

// GET /api/admin/rate-limits — list all rate limit configs (seeds if empty)
export async function GET() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth.error;

  // Seed defaults if empty
  const count = await prisma.rateLimitConfig.count();
  if (count === 0) {
    const defaults = PLANS.flatMap((plan) =>
      ACTIONS.map((action) => {
        const cfg = PLAN_RATE_LIMITS[plan]?.[action];
        return {
          plan,
          action,
          requests: cfg?.requests ?? 10,
          window: cfg?.window ?? "1 h",
          isUnlimited: cfg === null,
        };
      })
    );
    await prisma.rateLimitConfig.createMany({
      data: defaults,
      skipDuplicates: true,
    });
  }

  const configs = await prisma.rateLimitConfig.findMany({
    orderBy: [{ plan: "asc" }, { action: "asc" }],
  });

  return NextResponse.json({ configs });
}

// PUT /api/admin/rate-limits — batch update rate limit configs
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth.error;

  const body = await request.json();
  const { configs } = body as {
    configs: {
      plan: PlanTier;
      action: string;
      requests: number;
      window: string;
      isUnlimited: boolean;
    }[];
  };

  if (!Array.isArray(configs)) {
    return NextResponse.json({ error: "configs must be an array" }, { status: 400 });
  }

  // Upsert each config
  await Promise.all(
    configs.map((cfg) =>
      prisma.rateLimitConfig.upsert({
        where: { plan_action: { plan: cfg.plan, action: cfg.action } },
        create: {
          plan: cfg.plan,
          action: cfg.action,
          requests: cfg.requests,
          window: cfg.window,
          isUnlimited: cfg.isUnlimited,
        },
        update: {
          requests: cfg.requests,
          window: cfg.window,
          isUnlimited: cfg.isUnlimited,
        },
      })
    )
  );

  // Invalidate in-process cache so new limits take effect immediately
  invalidateRateLimitCache();

  return NextResponse.json({ success: true });
}
