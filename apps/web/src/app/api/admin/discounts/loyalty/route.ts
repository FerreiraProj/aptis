import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guards";
import { prisma } from "@aptis/database";
import { grantManualDiscount } from "@/lib/stripe/discounts";

// GET /api/admin/discounts/loyalty — active grants + eligible users (sub active 6+ months)
export async function GET() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth.error;

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [grants, eligible] = await Promise.all([
    prisma.userDiscount.findMany({
      where: { type: "LOYALTY", revokedAt: null },
      select: {
        id: true,
        discountPct: true,
        grantedAt: true,
        user: { select: { id: true, email: true, fullName: true } },
        grantedBy: { select: { email: true } },
      },
      orderBy: { grantedAt: "desc" },
    }),
    // Eligible: active subscription created 6+ months ago, no existing LOYALTY grant
    prisma.user.findMany({
      where: {
        subscription: {
          status: "ACTIVE",
          createdAt: { lte: sixMonthsAgo },
        },
        userDiscounts: { none: { type: "LOYALTY", revokedAt: null } },
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        subscription: { select: { createdAt: true } },
      },
      orderBy: { email: "asc" },
    }),
  ]);

  return NextResponse.json({ grants, eligible });
}

// POST /api/admin/discounts/loyalty — grant loyalty discount to a user
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth.error;

  const { userId } = await request.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const config = await prisma.discountConfig.findFirst();
  const pct = config?.loyaltyDiscountPct ?? 25;

  await grantManualDiscount(userId, auth.user.id, "LOYALTY", pct);

  return NextResponse.json({ success: true });
}
