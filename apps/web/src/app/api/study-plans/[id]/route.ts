import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@aptis/database";
import { requireAuth, isAuthError } from "@/lib/auth/guards";

type Params = { params: Promise<{ id: string }> };

// DELETE /api/study-plans/[id] — delete a study plan
export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  const { id } = await params;

  const plan = await prisma.studyPlan.findFirst({
    where: { id, userId: auth.user.id },
    select: { id: true },
  });

  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  await prisma.studyPlan.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
