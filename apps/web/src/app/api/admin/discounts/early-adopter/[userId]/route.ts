import { NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guards";
import { revokeManualDiscount } from "@/lib/stripe/discounts";

// DELETE /api/admin/discounts/early-adopter/[userId]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth.error;

  const { userId } = await params;
  await revokeManualDiscount(userId, "EARLY_ADOPTER", "admin_manual");

  return NextResponse.json({ success: true });
}
