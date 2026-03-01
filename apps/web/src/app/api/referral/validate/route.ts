import { NextRequest, NextResponse } from "next/server";
import { resolveCode } from "@/lib/referral";

// GET /api/referral/validate?code=X — public endpoint, validate a referral or affiliate code
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ valid: false });

  // Check referral code
  const referral = await resolveCode(code);
  if (referral) return NextResponse.json({ valid: true, type: "referral" });

  // Check affiliate code
  const { prisma } = await import("@aptis/database");
  const affiliate = await prisma.affiliatePartner.findFirst({
    where: { code: code.toUpperCase(), isActive: true },
  });
  if (affiliate) return NextResponse.json({ valid: true, type: "affiliate" });

  return NextResponse.json({ valid: false });
}
