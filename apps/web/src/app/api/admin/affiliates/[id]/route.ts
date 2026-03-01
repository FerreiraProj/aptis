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
  const {
    name, email, commissionType, commissionValue,
    recurringCommissionType, recurringCommissionValue, recurringMonths, isActive, notes,
  } = body;

  const numRecurringMonths = recurringMonths != null ? Number(recurringMonths) : undefined;
  const hasRecurring = (numRecurringMonths ?? 0) > 0 && recurringCommissionValue != null;

  const partner = await prisma.affiliatePartner.update({
    where: { id },
    data: {
      ...(name != null && { name }),
      ...(email != null && { email }),
      ...(commissionType != null && { commissionType }),
      ...(commissionValue != null && { commissionValue: Number(commissionValue) }),
      ...(numRecurringMonths != null && { recurringMonths: numRecurringMonths }),
      // Always update recurring fields when recurringMonths is provided
      ...(recurringMonths != null && {
        recurringCommissionType: hasRecurring ? (recurringCommissionType ?? commissionType) : null,
        recurringCommissionValue: hasRecurring ? Number(recurringCommissionValue) : null,
      }),
      ...(isActive != null && { isActive }),
      ...(notes != null && { notes }),
    },
  });

  return NextResponse.json(partner);
}
