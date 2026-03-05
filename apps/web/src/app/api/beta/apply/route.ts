import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@aptis/database";
import type { BetaStudyLevel, BetaFeedbackCommitment } from "@aptis/database";

// POST /api/beta/apply — public
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, studyLevel, disciplines, feedbackCommitment } = body as {
      email: string;
      studyLevel: BetaStudyLevel;
      disciplines: string;
      feedbackCommitment: BetaFeedbackCommitment;
    };

    if (!email || !studyLevel || !disciplines || !feedbackCommitment) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if beta mode is actually active
    const config = await prisma.siteConfig.findFirst();
    if (!config?.betaModeEnabled) {
      return NextResponse.json({ error: "Beta mode is not active" }, { status: 400 });
    }

    // Check if already applied
    const existing = await prisma.betaApplication.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "EMAIL_TAKEN" }, { status: 409 });
    }

    await prisma.betaApplication.create({
      data: { email, studyLevel, disciplines, feedbackCommitment },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[beta/apply]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
