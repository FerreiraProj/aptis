import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guards";
import { prisma } from "@aptis/database";
import { grantManualDiscount } from "@/lib/stripe/discounts";

// GET /api/admin/discounts/early-adopter — active grants + eligible users
export async function GET() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth.error;

  const [grants, eligible] = await Promise.all([
    prisma.userDiscount.findMany({
      where: { type: "EARLY_ADOPTER", revokedAt: null },
      select: {
        id: true,
        discountPct: true,
        grantedAt: true,
        user: { select: { id: true, email: true, fullName: true } },
        grantedBy: { select: { email: true } },
      },
      orderBy: { grantedAt: "desc" },
    }),
    // Eligible: active subscription, no existing EARLY_ADOPTER grant
    prisma.user.findMany({
      where: {
        subscription: { status: "ACTIVE" },
        userDiscounts: { none: { type: "EARLY_ADOPTER", revokedAt: null } },
      },
      select: { id: true, email: true, fullName: true },
      orderBy: { email: "asc" },
    }),
  ]);

  return NextResponse.json({ grants, eligible });
}

// POST /api/admin/discounts/early-adopter — grant discount to a user
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth.error;

  const { userId } = await request.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const config = await prisma.discountConfig.findFirst();
  const pct = config?.earlyAdopterDiscountPct ?? 30;

  await grantManualDiscount(userId, auth.user.id, "EARLY_ADOPTER", pct);

  return NextResponse.json({ success: true });
}
