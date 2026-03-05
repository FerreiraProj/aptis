import { NextResponse } from "next/server";
import { prisma } from "@aptis/database";

// GET /api/beta/config — public, used by landing page
export async function GET() {
  try {
    const config = await prisma.siteConfig.findFirst();
    return NextResponse.json({ betaModeEnabled: config?.betaModeEnabled ?? false });
  } catch {
    return NextResponse.json({ betaModeEnabled: false });
  }
}
