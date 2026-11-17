import { NextResponse } from "next/server";
import { getPublicPlans } from "@/lib/pricing";

// GET /api/pricing — public, no auth required
// Returns public plan configs for the landing page pricing section
export async function GET() {
  try {
    const plans = await getPublicPlans();
    return NextResponse.json({ plans });
  } catch (err) {
    console.error("[/api/pricing] Failed to load plan configs:", err);
    return NextResponse.json({ plans: [] });
  }
}
