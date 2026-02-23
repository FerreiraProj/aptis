import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { prisma } from "@aptis/database";
import { requireAuth, isAuthError } from "@/lib/auth/guards";
import { PLANS } from "@/lib/stripe/plans";
import type { PlanTier } from "@aptis/database";

// POST /api/stripe/create-checkout
// Body: { planTier: "PRO" | "PREMIUM", interval: "monthly" | "yearly" }
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  const body = await request.json();
  const { planTier, interval = "monthly" } = body as {
    planTier: Exclude<PlanTier, "FREE" | "INSTITUTIONAL">;
    interval: "monthly" | "yearly";
  };

  if (!planTier || !PLANS[planTier]) {
    return NextResponse.json({ error: "Invalid plan tier" }, { status: 400 });
  }

  const plan = PLANS[planTier];
  const priceId =
    interval === "yearly" && plan.priceYearlyId
      ? plan.priceYearlyId
      : plan.priceMonthlyId;

  if (!priceId) {
    return NextResponse.json(
      { error: "Price not configured" },
      { status: 500 }
    );
  }

  // Get or create Stripe customer
  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { stripeCustomerId: true, email: true },
  });

  let customerId = user?.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: auth.user.email,
      metadata: { userId: auth.user.id },
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: auth.user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      metadata: { userId: auth.user.id },
      trial_period_days: 7, // 7-day trial
    },
    success_url: `${appUrl}/dashboard?checkout=success`,
    cancel_url: `${appUrl}/settings?checkout=canceled`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
