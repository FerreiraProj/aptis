import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@aptis/database";
import { requireAuth, isAuthError } from "@/lib/auth/guards";
import { gradeQuizAttempt, type SubmittedAnswer } from "@/lib/quiz/grading";

type Params = { params: Promise<{ id: string }> };

// POST /api/quizzes/[id]/attempts
// Body: { answers: [{ questionId, selectedOptionIds, openResponse }] }
// Any client-sent `isCorrect` is ignored — grading happens here.
export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const submitted: unknown = body?.answers;

  if (!Array.isArray(submitted)) {
    return NextResponse.json({ error: "answers must be an array" }, { status: 400 });
  }

  // Verify quiz belongs to user (via document) and load the answer key
  const quiz = await prisma.quiz.findFirst({
    where: { id, document: { userId: auth.user.id } },
    select: {
      id: true,
      passingScore: true,
      questions: {
        select: {
          id: true,
          questionType: true,
          options: { select: { id: true, isCorrect: true } },
        },
      },
    },
  });

  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  const graded = gradeQuizAttempt(
    quiz.questions,
    submitted as SubmittedAnswer[],
    quiz.passingScore
  );

  const attempt = await prisma.quizAttempt.create({
    data: {
      userId: auth.user.id,
      quizId: quiz.id,
      score: graded.score,
      passed: graded.passed,
      completedAt: new Date(),
      answers: {
        create: graded.answers.map((a) => ({
          questionId: a.questionId,
          selectedOptions: a.selectedOptionIds,
          openResponse: a.openResponse,
          isCorrect: a.isCorrect,
        })),
      },
    },
    select: { id: true, score: true, passed: true },
  });

  return NextResponse.json({
    attempt,
    correctCount: graded.correctCount,
    gradableCount: graded.gradableCount,
  });
}
