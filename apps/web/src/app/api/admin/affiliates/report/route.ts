import { NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guards";
import { prisma } from "@aptis/database";

// GET /api/admin/affiliates/report — global commission report across all partners
export async function GET() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth.error;

  const partners = await prisma.affiliatePartner.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      code: true,
      isActive: true,
      referrals: {
        select: {
          commissions: { select: { amountCents: true, status: true, createdAt: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const rows = partners.map((p) => {
    const commissions = p.referrals.flatMap((r) => r.commissions);
    return {
      id: p.id,
      name: p.name,
      email: p.email,
      code: p.code,
      isActive: p.isActive,
      totalReferrals: p.referrals.length,
      pendingCents: commissions
        .filter((c) => c.status === "PENDING")
        .reduce((s, c) => s + c.amountCents, 0),
      paidCents: commissions
        .filter((c) => c.status === "PAID")
        .reduce((s, c) => s + c.amountCents, 0),
    };
  });

  const totals = {
    pendingCents: rows.reduce((s, r) => s + r.pendingCents, 0),
    paidCents: rows.reduce((s, r) => s + r.paidCents, 0),
  };

  return NextResponse.json({ partners: rows, totals });
}
