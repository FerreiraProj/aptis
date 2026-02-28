import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/auth/guards";
import { syncSubscriptionFromStripe } from "@/lib/stripe/sync-subscription";
import { prisma } from "@aptis/database";

// POST /api/stripe/sync-now
// Forces a subscription sync from Stripe and returns the current state.
export async function POST() {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  await syncSubscriptionFromStripe(auth.user.id);

  // Return the subscription state after sync
  const sub = await prisma.subscription.findUnique({
    where: { userId: auth.user.id },
    select: { plan: true, status: true, currentPeriodEnd: true },
  });

  return NextResponse.json({ subscription: sub ?? null });
}
