import { NextResponse } from "next/server";
import { prisma } from "@aptis/database";

// GET /api/pricing — public, no auth required
// Returns public plan configs for the landing page pricing section
export async function GET() {
  try {
    const plans = await prisma.planConfig.findMany({
      where: { isPublic: true },
      orderBy: { priceMonthly: "asc" },
      select: {
        id: true,
        plan: true,
        name: true,
        description: true,
        priceMonthly: true,
        priceYearly: true,
        promoPriceMonthly: true,
        promoPriceYearly: true,
        currency: true,
        features: true,
        trialDays: true,
      },
    });
    return NextResponse.json({ plans });
  } catch (err) {
    console.error("[/api/pricing] Failed to load plan configs:", err);
    return NextResponse.json({ plans: [] });
  }
}
