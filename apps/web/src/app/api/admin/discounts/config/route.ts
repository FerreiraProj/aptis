import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guards";
import { prisma } from "@aptis/database";

async function seedConfig() {
  return prisma.discountConfig.create({ data: {} });
}

// GET /api/admin/discounts/config
export async function GET() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth.error;

  let config = await prisma.discountConfig.findFirst();
  if (!config) config = await seedConfig();

  return NextResponse.json(config);
}

// PUT /api/admin/discounts/config
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth.error;

  const { referralDiscountPct, earlyAdopterDiscountPct, loyaltyDiscountPct } =
    await request.json();

  let config = await prisma.discountConfig.findFirst();
  if (!config) config = await seedConfig();

  const updated = await prisma.discountConfig.update({
    where: { id: config.id },
    data: { referralDiscountPct, earlyAdopterDiscountPct, loyaltyDiscountPct },
  });

  return NextResponse.json(updated);
}
