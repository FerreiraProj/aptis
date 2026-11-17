import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@aptis/database";
import { z } from "zod";
import { requireAdmin, isAuthError } from "@/lib/auth/guards";

type Params = { params: Promise<{ userId: string }> };

const GrantSchema = z.object({
  plan: z.enum(["FREE", "PRO", "PREMIUM", "INSTITUTIONAL"]),
  // Number of months, or null for an indefinite grant
  months: z.number().int().min(1).max(120).nullable(),
});

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  // Clamp overflow (e.g. 31 Jan + 1 month → 28/29 Feb, not 2/3 Mar)
  if (d.getDate() < day) d.setDate(0);
  return d;
}

// PUT /api/admin/users/[userId]/plan — grant a plan regardless of payment
export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth.error;

  const { userId } = await params;
  const parsed = GrantSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const exists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!exists) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { plan, months } = parsed.data;
  const now = new Date();

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      planOverride: plan,
      planOverrideExpiresAt: months === null ? null : addMonths(now, months),
      planOverrideGrantedAt: now,
    },
    select: { id: true, planOverride: true, planOverrideExpiresAt: true, planOverrideGrantedAt: true },
  });

  console.info(
    `[admin/plan] ${auth.dbUser.id} granted ${plan} to ${userId} for ${months ?? "∞"} months`
  );

  return NextResponse.json({ user });
}

// DELETE /api/admin/users/[userId]/plan — remove the admin grant (falls back to Stripe/FREE)
export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth.error;

  const { userId } = await params;
  const exists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!exists) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { planOverride: null, planOverrideExpiresAt: null, planOverrideGrantedAt: null },
  });

  console.info(`[admin/plan] ${auth.dbUser.id} removed plan grant from ${userId}`);

  return NextResponse.json({ success: true });
}
