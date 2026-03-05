import { stripe } from "./client";
import { prisma } from "@aptis/database";
import { getPlanFromPriceIdDB } from "./plans";

/**
 * Fetches the user's active Stripe subscription and upserts it into the DB.
 * Called after Stripe checkout success as a fallback when webhooks are delayed
 * (e.g. in local development where Stripe CLI isn't running).
 */
export async function syncSubscriptionFromStripe(userId: string): Promise<void> {
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    if (!dbUser?.stripeCustomerId) return;

    const subscriptions = await stripe.subscriptions.list({
      customer: dbUser.stripeCustomerId,
      status: "all",
      limit: 5,
    });

    // Pick the most recent active / trialing subscription
    const activeSub = subscriptions.data.find((s) =>
      ["active", "trialing", "past_due"].includes(s.status)
    );

    if (!activeSub) {
      console.info("[syncSubscriptionFromStripe] No active subscription found for customer", dbUser.stripeCustomerId);
      return;
    }

    const subItem = activeSub.items.data[0];
    // price can be a string ID or a Price object depending on expansion
    const price = subItem.price;
    const priceId = typeof price === "string" ? price : price.id;
    const productId = typeof price === "string" ? "" : (price.product as string);
    const plan = await getPlanFromPriceIdDB(priceId);

    console.info("[syncSubscriptionFromStripe] Syncing subscription", activeSub.id, "plan:", plan, "status:", activeSub.status);

    await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        stripeSubscriptionId: activeSub.id,
        stripePriceId: priceId,
        stripeProductId: productId,
        status: activeSub.status.toUpperCase() as never,
        plan,
        currentPeriodStart: new Date(subItem.current_period_start * 1000),
        currentPeriodEnd: new Date(subItem.current_period_end * 1000),
        cancelAtPeriodEnd: activeSub.cancel_at_period_end,
        trialStart: activeSub.trial_start
          ? new Date(activeSub.trial_start * 1000)
          : null,
        trialEnd: activeSub.trial_end
          ? new Date(activeSub.trial_end * 1000)
          : null,
      },
      update: {
        stripeSubscriptionId: activeSub.id,
        stripePriceId: priceId,
        stripeProductId: productId,
        status: activeSub.status.toUpperCase() as never,
        plan,
        currentPeriodStart: new Date(subItem.current_period_start * 1000),
        currentPeriodEnd: new Date(subItem.current_period_end * 1000),
        cancelAtPeriodEnd: activeSub.cancel_at_period_end,
        trialStart: activeSub.trial_start
          ? new Date(activeSub.trial_start * 1000)
          : null,
        trialEnd: activeSub.trial_end
          ? new Date(activeSub.trial_end * 1000)
          : null,
      },
    });
  } catch (err) {
    // Non-fatal: webhook will handle it if this fails
    console.error("[syncSubscriptionFromStripe]", err);
  }
}
