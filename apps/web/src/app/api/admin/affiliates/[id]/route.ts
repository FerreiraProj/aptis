import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guards";
import { prisma } from "@aptis/database";

// PUT /api/admin/affiliates/[id] — update partner
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const { name, email, commissionType, commissionValue, recurringMonths, isActive, notes } = body;

  const partner = await prisma.affiliatePartner.update({
    where: { id },
    data: {
      ...(name != null && { name }),
      ...(email != null && { email }),
      ...(commissionType != null && { commissionType }),
      ...(commissionValue != null && { commissionValue: Number(commissionValue) }),
      ...(recurringMonths != null && { recurringMonths: Number(recurringMonths) }),
      ...(isActive != null && { isActive }),
      ...(notes != null && { notes }),
    },
  });

  return NextResponse.json(partner);
}
