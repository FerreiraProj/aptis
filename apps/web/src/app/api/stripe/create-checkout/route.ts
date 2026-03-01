import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { stripe } from "@/lib/stripe/client";
import { prisma } from "@aptis/database";
import { requireAuth, isAuthError } from "@/lib/auth/guards";
import { getStripePriceId } from "@/lib/stripe/plans";
import { resolveCode, registerReferralSignup } from "@/lib/referral";
import type { PlanTier } from "@aptis/database";

// POST /api/stripe/create-checkout
// Body: { planTier: "PRO" | "PREMIUM", interval: "monthly" | "yearly", referralCode?: string, affiliateCode?: string }
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isAuthError(auth)) return auth.error;

    const body = await request.json();
    const {
      planTier,
      interval = "monthly",
      referralCode,
      affiliateCode,
    } = body as {
      planTier: Exclude<PlanTier, "FREE" | "INSTITUTIONAL">;
      interval: "monthly" | "yearly";
      referralCode?: string;
      affiliateCode?: string;
    };

    if (!planTier || !["PRO", "PREMIUM"].includes(planTier)) {
      return NextResponse.json({ error: "Invalid plan tier" }, { status: 400 });
    }

    // Read Stripe price ID from DB (with env var fallback)
    const priceId = await getStripePriceId(planTier, interval);

    if (!priceId) {
      return NextResponse.json(
        { error: "Stripe price ID não configurado para este plano. Configura o ID em /admin/plans." },
        { status: 500 }
      );
    }

    // Register referral signup (before payment — marks intent)
    if (referralCode) {
      const ref = await resolveCode(referralCode);
      if (ref && ref.userId !== auth.user.id) {
        await registerReferralSignup(referralCode, auth.user.id);
      }
    }

    // Register affiliate referral
    if (affiliateCode) {
      const partner = await prisma.affiliatePartner.findFirst({
        where: { code: affiliateCode.toUpperCase(), isActive: true },
      });
      if (partner) {
        await prisma.affiliateReferral.upsert({
          where: {
            partnerId_referredUserId: {
              partnerId: partner.id,
              referredUserId: auth.user.id,
            },
          },
          create: {
            partnerId: partner.id,
            referredUserId: auth.user.id,
            commissionType: partner.commissionType,
            commissionValue: partner.commissionValue,
            recurringMonths: partner.recurringMonths,
          },
          update: {},
        });
      }
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

    // Read trial days from DB plan config
    const planConfig = await prisma.planConfig.findUnique({
      where: { plan: planTier },
      select: { trialDays: true },
    });
    const trialDays = planConfig?.trialDays ?? 7;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: {
          userId: auth.user.id,
          referralCode: referralCode ?? "",
          affiliateCode: affiliateCode ?? "",
        },
        ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
      },
      success_url: `${appUrl}/dashboard?checkout=success`,
      cancel_url: `${appUrl}/settings?checkout=canceled`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    console.error("[create-checkout]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
