import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe/client";
import { prisma } from "@aptis/database";
import { getPlanFromPriceIdDB } from "@/lib/stripe/plans";
import { convertReferral } from "@/lib/referral";
import { revokeManualDiscount, calculateAffiliateCommission } from "@/lib/stripe/discounts";
import { sendLoyaltyDiscountWarning } from "@/lib/email/resend";

// CRITICAL: Must use raw body, not parsed JSON
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;

        if (!userId) {
          console.error("No userId in subscription metadata:", sub.id);
          break;
        }

        const subItem = sub.items.data[0];
        const priceId = subItem.price.id;
        // Use DB-backed lookup so renamed price IDs are picked up immediately
        const plan = await getPlanFromPriceIdDB(priceId);

        await prisma.subscription.upsert({
          where: { stripeSubscriptionId: sub.id },
          create: {
            userId,
            stripeSubscriptionId: sub.id,
            stripePriceId: priceId,
            stripeProductId: subItem.price.product as string,
            status: sub.status.toUpperCase() as never,
            plan,
            currentPeriodStart: new Date(subItem.current_period_start * 1000),
            currentPeriodEnd: new Date(subItem.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            trialStart: sub.trial_start
              ? new Date(sub.trial_start * 1000)
              : null,
            trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
          },
          update: {
            status: sub.status.toUpperCase() as never,
            plan,
            stripePriceId: priceId,
            currentPeriodStart: new Date(subItem.current_period_start * 1000),
            currentPeriodEnd: new Date(subItem.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            canceledAt: sub.canceled_at
              ? new Date(sub.canceled_at * 1000)
              : null,
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: { status: "CANCELED", canceledAt: new Date() },
        });

        const userId = sub.metadata?.userId;
        if (userId) {
          // Revoke all active manual discounts
          const discounts = await prisma.userDiscount.findMany({
            where: { userId, revokedAt: null },
          });
          for (const d of discounts) {
            await revokeManualDiscount(userId, d.type, "subscription_canceled");
            if (d.type === "LOYALTY") {
              const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { email: true, fullName: true },
              });
              if (user) {
                await sendLoyaltyDiscountWarning(user.email, user.fullName ?? "", d.discountPct).catch(
                  (err) => console.error("[webhook] sendLoyaltyDiscountWarning failed:", err)
                );
              }
            }
          }

          // Cancel affiliate referrals
          await prisma.affiliateReferral.updateMany({
            where: { referredUserId: userId, canceledAt: null },
            data: { canceledAt: new Date() },
          });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        // invoice.subscription exists at runtime but may not be in the clover type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawSub = (invoice as any).subscription;
        const subId = typeof rawSub === "string" ? rawSub : null;
        if (!subId) break;

        const sub = await stripe.subscriptions.retrieve(subId);
        const userId = sub.metadata?.userId;
        if (!userId) break;

        // Convert student referral on first payment
        await convertReferral(userId, subId).catch(
          (err) => console.error("[webhook] convertReferral failed:", err)
        );

        // Affiliate commission
        const affiliateRef = await prisma.affiliateReferral.findFirst({
          where: { referredUserId: userId, canceledAt: null },
        });
        if (affiliateRef) {
          const shouldCredit =
            affiliateRef.recurringMonths === 0
              ? affiliateRef.paymentsTracked === 0
              : affiliateRef.paymentsTracked < affiliateRef.recurringMonths;

          if (shouldCredit) {
            const amount = calculateAffiliateCommission(
              invoice.amount_paid,
              affiliateRef.commissionType,
              affiliateRef.commissionValue
            );
            await prisma.$transaction([
              prisma.affiliateCommission.create({
                data: {
                  referralId: affiliateRef.id,
                  amountCents: amount,
                  stripeInvoiceId: invoice.id,
                },
              }),
              prisma.affiliateReferral.update({
                where: { id: affiliateRef.id },
                data: {
                  paymentsTracked: { increment: 1 },
                  convertedAt: affiliateRef.convertedAt ?? new Date(),
                },
              }),
            ]);
          }
        }
        break;
      }

      case "customer.created": {
        const customer = event.data.object as Stripe.Customer;
        const userId = customer.metadata?.userId;
        if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: { stripeCustomerId: customer.id },
          });
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("Error processing Stripe webhook:", err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
