import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@aptis/database";
import { requireAdmin, isAuthError } from "@/lib/auth/guards";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth.error;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { notes } = body as { notes?: string };

  const application = await prisma.betaApplication.findUnique({ where: { id } });
  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const updated = await prisma.betaApplication.update({
    where: { id },
    data: {
      status: "REJECTED",
      notes: notes ?? application.notes,
      reviewedByAdminId: auth.dbUser.id,
      reviewedAt: new Date(),
    },
  });

  return NextResponse.json({ application: updated });
}
