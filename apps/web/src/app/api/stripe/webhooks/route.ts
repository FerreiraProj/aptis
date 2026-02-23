import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe/client";
import { prisma } from "@aptis/database";
import { getPlanFromPriceId } from "@/lib/stripe/plans";

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

        const priceId = sub.items.data[0].price.id;
        const plan = getPlanFromPriceId(priceId);

        await prisma.subscription.upsert({
          where: { stripeSubscriptionId: sub.id },
          create: {
            userId,
            stripeSubscriptionId: sub.id,
            stripePriceId: priceId,
            stripeProductId: sub.items.data[0].price.product as string,
            status: sub.status.toUpperCase() as never,
            plan,
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
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
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
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
        // Unhandled event type — not an error
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
