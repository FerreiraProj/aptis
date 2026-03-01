import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/auth/guards";
import { getOrCreateReferralCode } from "@/lib/referral";
import { prisma } from "@aptis/database";

// POST /api/referral/init — create or return the user's referral code
export async function POST() {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { fullName: true },
  });

  const referralCode = await getOrCreateReferralCode(auth.user.id, user?.fullName);
  return NextResponse.json({ code: referralCode.code });
}
