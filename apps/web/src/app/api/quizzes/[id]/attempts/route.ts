import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@aptis/database";
import { requireAuth, isAuthError } from "@/lib/auth/guards";
import { checkRateLimit, getUserPlan } from "@/lib/rate-limit";
import { gradeOpenAnswers, type OpenAnswerToGrade } from "@/lib/ai/open-answer-grader";
import { localeToLanguage } from "@/lib/ai/language";
import {
  gradeQuizAttempt,
  isChoiceQuestion,
  type OpenGrade,
  type SubmittedAnswer,
} from "@/lib/quiz/grading";

type Params = { params: Promise<{ id: string }> };

// Open answers are graded by AI in parallel before the attempt is saved.
export const maxDuration = 120;

// POST /api/quizzes/[id]/attempts
// Body: { answers: [{ questionId, selectedOptionIds, openResponse }], locale?, timeTaken? }
// Any client-sent `isCorrect` is ignored — all grading happens here.
export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const submitted: unknown = body?.answers;
  const locale: unknown = body?.locale;
  const timeTaken: unknown = body?.timeTaken;

  if (!Array.isArray(submitted)) {
    return NextResponse.json({ error: "answers must be an array" }, { status: 400 });
  }

  // Verify quiz belongs to user (via document) and load the answer key
  const quiz = await prisma.quiz.findFirst({
    where: { id, document: { userId: auth.user.id } },
    select: {
      id: true,
      documentId: true,
      passingScore: true,
      questions: {
        select: {
          id: true,
          questionType: true,
          questionText: true,
          explanation: true,
          options: { select: { id: true, isCorrect: true } },
        },
      },
    },
  });

  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  // ── AI-grade the open answers ─────────────────────────────────────────────
  const answersById = new Map(
    (submitted as SubmittedAnswer[])
      .filter((a) => a && typeof a.questionId === "string")
      .map((a) => [a.questionId, a])
  );
  const openToGrade: OpenAnswerToGrade[] = quiz.questions
    .filter((q) => !isChoiceQuestion(q.questionType))
    .map((q) => ({ q, response: answersById.get(q.id)?.openResponse }))
    .filter(
      (x): x is { q: (typeof quiz.questions)[number]; response: string } =>
        typeof x.response === "string" && x.response.trim().length > 0
    )
    .map(({ q, response }) => ({
      questionId: q.id,
      questionText: q.questionText,
      modelAnswer: q.explanation,
      response,
    }));

  let openGrades = new Map<string, OpenGrade>();
  if (openToGrade.length > 0) {
    const plan = await getUserPlan(auth.user.id);
    const rateLimit = await checkRateLimit("grade", auth.user.id, plan);
    if (rateLimit.success) {
      openGrades = await gradeOpenAnswers(openToGrade, {
        userId: auth.user.id,
        documentId: quiz.documentId,
        language: localeToLanguage(typeof locale === "string" ? locale : "pt"),
      });
    } else {
      // Still save the attempt; open answers are left ungraded (excluded from score)
      console.warn("[attempts] grade rate limit reached — open answers not graded");
    }
  }

  const graded = gradeQuizAttempt(
    quiz.questions,
    submitted as SubmittedAnswer[],
    quiz.passingScore,
    openGrades
  );

  const attempt = await prisma.quizAttempt.create({
    data: {
      userId: auth.user.id,
      quizId: quiz.id,
      score: graded.score,
      passed: graded.passed,
      timeTaken:
        typeof timeTaken === "number" && Number.isFinite(timeTaken) && timeTaken >= 0
          ? Math.round(timeTaken)
          : null,
      completedAt: new Date(),
      answers: {
        create: graded.answers.map((a) => ({
          questionId: a.questionId,
          selectedOptions: a.selectedOptionIds,
          openResponse: a.openResponse,
          isCorrect: a.isCorrect,
          score: a.score,
          aiFeedback: a.aiFeedback,
        })),
      },
    },
    select: { id: true, score: true, passed: true },
  });

  return NextResponse.json({
    attempt,
    correctCount: graded.correctCount,
    gradableCount: graded.gradableCount,
    ungradedOpenCount: openToGrade.length - openGrades.size,
    answers: graded.answers.map((a) => ({
      questionId: a.questionId,
      isCorrect: a.isCorrect,
      score: a.score,
      aiFeedback: a.aiFeedback,
    })),
  });
}
