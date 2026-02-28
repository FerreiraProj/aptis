import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@aptis/database";
import { requireAdmin, isAuthError } from "@/lib/auth/guards";
import { invalidatePlanConfigCache } from "@/lib/stripe/plans";
import type { PlanTier } from "@aptis/database";

type Params = { params: Promise<{ plan: string }> };

// PUT /api/admin/plans/[plan] — update a plan config
export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth.error;

  const { plan } = await params;
  const validPlans: PlanTier[] = ["FREE", "PRO", "PREMIUM", "INSTITUTIONAL"];
  if (!validPlans.includes(plan as PlanTier)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const body = await request.json();
  const {
    name,
    description,
    priceMonthly,
    priceYearly,
    promoPriceMonthly,
    promoPriceYearly,
    stripePriceIdMonthly,
    stripePriceIdYearly,
    features,
    isPublic,
    trialDays,
  } = body as {
    name?: string;
    description?: string;
    priceMonthly?: number;
    priceYearly?: number;
    promoPriceMonthly?: number | null;
    promoPriceYearly?: number | null;
    stripePriceIdMonthly?: string | null;
    stripePriceIdYearly?: string | null;
    features?: string[];
    isPublic?: boolean;
    trialDays?: number;
  };

  const updated = await prisma.planConfig.upsert({
    where: { plan: plan as PlanTier },
    create: {
      plan: plan as PlanTier,
      name: name ?? plan,
      description,
      priceMonthly: priceMonthly ?? 0,
      priceYearly: priceYearly ?? 0,
      promoPriceMonthly: promoPriceMonthly ?? null,
      promoPriceYearly: promoPriceYearly ?? null,
      stripePriceIdMonthly: stripePriceIdMonthly ?? null,
      stripePriceIdYearly: stripePriceIdYearly ?? null,
      features: features ?? [],
      isPublic: isPublic ?? true,
      trialDays: trialDays ?? 7,
    },
    update: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(priceMonthly !== undefined && { priceMonthly }),
      ...(priceYearly !== undefined && { priceYearly }),
      ...(promoPriceMonthly !== undefined && { promoPriceMonthly }),
      ...(promoPriceYearly !== undefined && { promoPriceYearly }),
      ...(stripePriceIdMonthly !== undefined && { stripePriceIdMonthly }),
      ...(stripePriceIdYearly !== undefined && { stripePriceIdYearly }),
      ...(features !== undefined && { features }),
      ...(isPublic !== undefined && { isPublic }),
      ...(trialDays !== undefined && { trialDays }),
    },
  });

  // Invalidate in-process cache so new price IDs are picked up immediately
  invalidatePlanConfigCache();

  return NextResponse.json({ plan: updated });
}
