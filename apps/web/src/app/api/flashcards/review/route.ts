import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@aptis/database";
import { requireAuth, isAuthError } from "@/lib/auth/guards";
import {
  calculateNextReview,
  type ReviewGrade,
} from "@/lib/spaced-repetition/sm2";

// POST /api/flashcards/review — Submit SM-2 grade for a card
// Body: { flashcardId: string, grade: "AGAIN" | "HARD" | "GOOD" | "EASY", responseTime?: number }
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  const body = await request.json();
  const {
    flashcardId,
    grade,
    responseTime,
  }: { flashcardId: string; grade: ReviewGrade; responseTime?: number } = body;

  if (!flashcardId || !grade) {
    return NextResponse.json(
      { error: "flashcardId and grade are required" },
      { status: 400 }
    );
  }

  const validGrades: ReviewGrade[] = ["AGAIN", "HARD", "GOOD", "EASY"];
  if (!validGrades.includes(grade)) {
    return NextResponse.json(
      { error: `grade must be one of: ${validGrades.join(", ")}` },
      { status: 400 }
    );
  }

  // Fetch the flashcard
  const flashcard = await prisma.flashcard.findFirst({
    where: { id: flashcardId, userId: auth.user.id },
  });

  if (!flashcard) {
    return NextResponse.json({ error: "Flashcard not found" }, { status: 404 });
  }

  // Calculate next review state
  const sm2Result = calculateNextReview(flashcard, grade);

  // Update flashcard and create progress record in a transaction
  const [updatedFlashcard] = await prisma.$transaction([
    prisma.flashcard.update({
      where: { id: flashcardId },
      data: sm2Result,
    }),
    prisma.progressRecord.create({
      data: {
        userId: auth.user.id,
        flashcardId,
        grade: gradeToNumber(grade),
        prevInterval: flashcard.smInterval,
        newInterval: sm2Result.smInterval,
        prevEfactor: flashcard.smEfactor,
        newEfactor: sm2Result.smEfactor,
        responseTime,
      },
    }),
  ]);

  return NextResponse.json({
    flashcard: updatedFlashcard,
    nextReview: sm2Result.smDueDate,
  });
}

function gradeToNumber(grade: ReviewGrade): number {
  const map = { AGAIN: 0, HARD: 2, GOOD: 4, EASY: 5 };
  return map[grade];
}
