import Stripe from "stripe";
import { stripe } from "./client";
import { prisma } from "@aptis/database";
import type { DiscountType, CommissionType } from "@aptis/database";

// ─── Coupon helpers ───────────────────────────────────────────────────────────

function couponName(type: "referral" | "early_adopter" | "loyalty", pct: number, months?: number): string {
  if (type === "referral") return `APTIS_REFERRAL_${pct}PCT_${months ?? 1}MO`;
  if (type === "early_adopter") return `APTIS_EARLY_ADOPTER_${pct}PCT`;
  return `APTIS_LOYALTY_${pct}PCT`;
}

/** Find or create a Stripe coupon by name. Returns coupon ID. */
export async function createOrReuseCoupon(
  type: "referral" | "early_adopter" | "loyalty",
  pct: number,
  months?: number
): Promise<string> {
  const name = couponName(type, pct, months);

  // Search by name (Stripe doesn't have "find by name", so we page through)
  const existing = await stripe.coupons.list({ limit: 100 });
  const found = existing.data.find((c) => c.name === name);
  if (found) return found.id;

  const isReferral = type === "referral" && !!months;
  const couponParams: Stripe.CouponCreateParams = {
    name,
    percent_off: pct,
    currency: "eur",
    duration: isReferral ? "repeating" : "forever",
    ...(isReferral ? { duration_in_months: months } : {}),
  };

  const coupon = await stripe.coupons.create(couponParams);
  return coupon.id;
}

/** Apply a coupon to a Stripe subscription (identified by customer ID). */
export async function applyCouponToSub(stripeCustomerId: string, couponId: string) {
  const subs = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: "active",
    limit: 1,
  });
  const sub = subs.data[0];
  if (!sub) return;
  await stripe.subscriptions.update(sub.id, { discounts: [{ coupon: couponId }] });
}

/** Remove all discounts from the active subscription of a customer. */
export async function removeCouponFromSub(stripeCustomerId: string) {
  const subs = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: "active",
    limit: 1,
  });
  const sub = subs.data[0];
  if (!sub) return;
  await stripe.subscriptions.update(sub.id, { discounts: [] });
}

// ─── Manual discounts (early adopter / loyalty) ───────────────────────────────

/** Grant a manual discount (EARLY_ADOPTER or LOYALTY) to a user. */
export async function grantManualDiscount(
  userId: string,
  adminId: string,
  type: DiscountType,
  pct: number
) {
  const couponType = type === "EARLY_ADOPTER" ? "early_adopter" : "loyalty";
  const couponId = await createOrReuseCoupon(couponType, pct);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (user?.stripeCustomerId) {
    await applyCouponToSub(user.stripeCustomerId, couponId);
  }

  await prisma.userDiscount.create({
    data: {
      userId,
      type,
      discountPct: pct,
      stripeCouponId: couponId,
      grantedByAdminId: adminId,
    },
  });
}

/** Revoke an active manual discount for a user. */
export async function revokeManualDiscount(
  userId: string,
  type: DiscountType,
  reason: string
) {
  const discount = await prisma.userDiscount.findFirst({
    where: { userId, type, revokedAt: null },
  });
  if (!discount) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (user?.stripeCustomerId) {
    await removeCouponFromSub(user.stripeCustomerId);
  }

  await prisma.userDiscount.update({
    where: { id: discount.id },
    data: { revokedAt: new Date(), revokeReason: reason },
  });
}

// ─── Referral discount ────────────────────────────────────────────────────────

/**
 * Apply all pending referral months to the user's Stripe subscription.
 * Creates/replaces a "repeating" coupon for the total pending months,
 * then moves pendingMonths → appliedMonths.
 */
export async function applyPendingReferralMonths(userId: string) {
  const ref = await prisma.referralCode.findUnique({ where: { userId } });
  if (!ref || ref.pendingMonths === 0) return;

  // Read configured discount % for referrals
  const config = await prisma.discountConfig.findFirst();
  const pct = config?.referralDiscountPct ?? 20;
  const totalMonths = ref.pendingMonths;

  const couponId = await createOrReuseCoupon("referral", pct, totalMonths);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (user?.stripeCustomerId) {
    await applyCouponToSub(user.stripeCustomerId, couponId);
  }

  await prisma.referralCode.update({
    where: { userId },
    data: {
      appliedMonths: { increment: totalMonths },
      pendingMonths: 0,
    },
  });
}

// ─── Affiliate commission calculation ────────────────────────────────────────

export function calculateAffiliateCommission(
  amountPaidCents: number,
  type: CommissionType,
  value: number
): number {
  if (type === "FIXED_EUR") return value;
  return Math.round((amountPaidCents * value) / 100);
}
