import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/auth/guards";
import { applyPendingReferralMonths } from "@/lib/stripe/discounts";
import { prisma } from "@aptis/database";

// POST /api/referral/apply — apply pending referral months to Stripe subscription now
export async function POST() {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  const ref = await prisma.referralCode.findUnique({
    where: { userId: auth.user.id },
    select: { pendingMonths: true },
  });

  if (!ref || ref.pendingMonths === 0) {
    return NextResponse.json({ error: "Sem meses pendentes" }, { status: 400 });
  }

  await applyPendingReferralMonths(auth.user.id);

  return NextResponse.json({ success: true });
}
