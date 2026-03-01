import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guards";
import { prisma } from "@aptis/database";

// POST /api/admin/affiliates/[id]/commissions/[commissionId]/mark-paid
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commissionId: string }> }
) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth.error;

  const { commissionId } = await params;
  const body = await request.json().catch(() => ({}));
  const notes = body.notes as string | undefined;

  const commission = await prisma.affiliateCommission.update({
    where: { id: commissionId },
    data: {
      status: "PAID",
      paidAt: new Date(),
      paidByAdminId: auth.user.id,
      ...(notes != null && { notes }),
    },
  });

  return NextResponse.json(commission);
}
