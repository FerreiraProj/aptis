import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@aptis/database";
import { requireAdmin, isAuthError } from "@/lib/auth/guards";

async function seedConfig() {
  return prisma.siteConfig.create({ data: {} });
}

export async function GET() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth.error;

  let config = await prisma.siteConfig.findFirst();
  if (!config) config = await seedConfig();

  const [total, pending, approved, rejected] = await Promise.all([
    prisma.betaApplication.count(),
    prisma.betaApplication.count({ where: { status: "PENDING" } }),
    prisma.betaApplication.count({ where: { status: "APPROVED" } }),
    prisma.betaApplication.count({ where: { status: "REJECTED" } }),
  ]);

  return NextResponse.json({ config, stats: { total, pending, approved, rejected } });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth.error;

  const { betaModeEnabled } = await request.json();

  let config = await prisma.siteConfig.findFirst();
  if (!config) {
    config = await prisma.siteConfig.create({ data: { betaModeEnabled } });
  } else {
    config = await prisma.siteConfig.update({
      where: { id: config.id },
      data: { betaModeEnabled },
    });
  }

  return NextResponse.json({ config });
}
