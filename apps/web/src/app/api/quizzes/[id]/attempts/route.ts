import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@aptis/database";
import { requireAuth, isAuthError } from "@/lib/auth/guards";

type Params = { params: Promise<{ id: string }> };

// POST /api/quizzes/[id]/attempts
export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  const { id } = await params;
  const { answers } = await request.json();

  // Verify quiz belongs to user (via document)
  const quiz = await prisma.quiz.findFirst({
    where: { id, document: { userId: auth.user.id } },
    select: { id: true, passingScore: true, _count: { select: { questions: true } } },
  });

  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  // Calculate score from MC answers
  const mcAnswers = (answers as Array<{
    questionId: string;
    selectedOptionIds: string[];
    openResponse: string | null;
    isCorrect: boolean | null;
  }>).filter((a) => a.isCorrect !== null);

  const correctCount = mcAnswers.filter((a) => a.isCorrect).length;
  const score =
    mcAnswers.length > 0
      ? (correctCount / quiz._count.questions) * 100
      : null;
  const passed = score !== null ? score >= quiz.passingScore : null;

  const attempt = await prisma.quizAttempt.create({
    data: {
      userId: auth.user.id,
      quizId: quiz.id,
      score,
      passed,
      completedAt: new Date(),
      answers: {
        create: (answers as Array<{
          questionId: string;
          selectedOptionIds: string[];
          openResponse: string | null;
          isCorrect: boolean | null;
        }>).map((a) => ({
          questionId: a.questionId,
          selectedOptions: a.selectedOptionIds,
          openResponse: a.openResponse,
          isCorrect: a.isCorrect,
        })),
      },
    },
    select: { id: true, score: true, passed: true },
  });

  return NextResponse.json({ attempt });
}
