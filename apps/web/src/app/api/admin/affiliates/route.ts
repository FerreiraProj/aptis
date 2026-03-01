import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guards";
import { prisma } from "@aptis/database";

function generateCode(name: string): string {
  const slug = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 10);
  const suffix = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `${slug}-${suffix}`;
}

// GET /api/admin/affiliates — list all partners with commission totals
export async function GET() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth.error;

  const partners = await prisma.affiliatePartner.findMany({
    include: {
      referrals: {
        include: { commissions: { select: { amountCents: true, status: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const data = partners.map((p) => {
    const allCommissions = p.referrals.flatMap((r) => r.commissions);
    return {
      id: p.id,
      name: p.name,
      email: p.email,
      code: p.code,
      commissionType: p.commissionType,
      commissionValue: p.commissionValue,
      recurringMonths: p.recurringMonths,
      isActive: p.isActive,
      notes: p.notes,
      createdAt: p.createdAt,
      totalReferrals: p.referrals.length,
      pendingCents: allCommissions
        .filter((c) => c.status === "PENDING")
        .reduce((sum, c) => sum + c.amountCents, 0),
      paidCents: allCommissions
        .filter((c) => c.status === "PAID")
        .reduce((sum, c) => sum + c.amountCents, 0),
    };
  });

  return NextResponse.json(data);
}

// POST /api/admin/affiliates — create a new partner
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth.error;

  const body = await request.json();
  const { name, email, code, commissionType, commissionValue, recurringMonths, notes } = body;

  if (!name || !email || !commissionType || commissionValue == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const finalCode = (code ?? generateCode(name)).toUpperCase();

  const partner = await prisma.affiliatePartner.create({
    data: {
      name,
      email,
      code: finalCode,
      commissionType,
      commissionValue: Number(commissionValue),
      recurringMonths: Number(recurringMonths ?? 0),
      notes,
      createdByAdminId: auth.user.id,
    },
  });

  return NextResponse.json(partner, { status: 201 });
}
