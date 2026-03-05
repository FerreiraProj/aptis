import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@aptis/database";
import { requireAdmin, isAuthError } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendBetaApprovedEmail } from "@/lib/email/resend";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth.error;

  const { id } = await params;
  const { password } = await request.json();

  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const application = await prisma.betaApplication.findUnique({ where: { id } });
  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }
  if (application.status !== "PENDING") {
    return NextResponse.json({ error: "Application is not pending" }, { status: 400 });
  }

  // Create Supabase user
  const { data: supaUser, error: supaError } = await supabaseAdmin().auth.admin.createUser({
    email: application.email,
    password,
    email_confirm: true,
  });

  if (supaError || !supaUser.user) {
    console.error("[beta/approve] Supabase createUser error:", supaError);
    return NextResponse.json(
      { error: supaError?.message ?? "Failed to create user account" },
      { status: 500 }
    );
  }

  // Ensure user row exists in our DB (may be created by Supabase trigger)
  await prisma.user.upsert({
    where: { id: supaUser.user.id },
    create: { id: supaUser.user.id, email: application.email },
    update: {},
  });

  // Send approval email
  try {
    await sendBetaApprovedEmail(application.email, password);
  } catch (emailErr) {
    console.error("[beta/approve] Email send failed:", emailErr);
    // Non-fatal: user was still created
  }

  // Mark application as approved
  const updated = await prisma.betaApplication.update({
    where: { id },
    data: {
      status: "APPROVED",
      reviewedByAdminId: auth.dbUser.id,
      reviewedAt: new Date(),
    },
  });

  return NextResponse.json({ application: updated });
}
