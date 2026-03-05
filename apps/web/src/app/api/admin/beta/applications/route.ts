import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@aptis/database";
import { requireAdmin, isAuthError } from "@/lib/auth/guards";
import type { BetaApplicationStatus } from "@aptis/database";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth.error;

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");

  const where =
    statusParam && statusParam !== "ALL"
      ? { status: statusParam as BetaApplicationStatus }
      : undefined;

  const applications = await prisma.betaApplication.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ applications });
}
