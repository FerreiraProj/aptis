import { NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guards";
import { prisma } from "@aptis/database";

// GET /api/admin/affiliates/[id]/commissions — commission report for one partner
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth.error;

  const { id } = await params;

  const referrals = await prisma.affiliateReferral.findMany({
    where: { partnerId: id },
    include: {
      referredUser: { select: { email: true, fullName: true } },
      commissions: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(referrals);
}
