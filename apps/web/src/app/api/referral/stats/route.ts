import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/auth/guards";
import { getOrCreateReferralCode } from "@/lib/referral";
import { prisma } from "@aptis/database";

// GET /api/referral/stats — referral code + stats for the authenticated user
export async function GET() {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { fullName: true },
  });

  const referralCode = await getOrCreateReferralCode(auth.user.id, user?.fullName);

  const uses = await prisma.referralUse.findMany({
    where: { referralCodeId: referralCode.id },
    select: {
      id: true,
      convertedAt: true,
      creditedAt: true,
      createdAt: true,
      referredUser: { select: { email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const history = uses.map((u) => ({
    id: u.id,
    email: maskEmail(u.referredUser.email),
    signedUpAt: u.createdAt,
    convertedAt: u.convertedAt,
    creditedAt: u.creditedAt,
  }));

  return NextResponse.json({
    code: referralCode.code,
    pendingMonths: referralCode.pendingMonths,
    appliedMonths: referralCode.appliedMonths,
    totalReferrals: uses.length,
    converted: uses.filter((u) => u.convertedAt).length,
    history,
  });
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  return `${local.slice(0, 1)}***@${domain}`;
}
