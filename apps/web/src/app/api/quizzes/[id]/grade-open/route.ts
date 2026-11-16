import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@aptis/database";
import { z } from "zod";
import { requireAuth, isAuthError } from "@/lib/auth/guards";
import { checkRateLimit, getUserPlan } from "@/lib/rate-limit";
import { gradeOpenAnswer } from "@/lib/ai/open-answer-grader";
import { AI_LOCALES, localeToLanguage } from "@/lib/ai/language";
import { OPEN_ANSWER_CORRECT_THRESHOLD } from "@/lib/quiz/grading";

type Params = { params: Promise<{ id: string }> };

export const maxDuration = 60;

const BodySchema = z.object({
  questionId: z.string().uuid(),
  response: z.string().trim().min(1).max(10_000),
  locale: z.enum(AI_LOCALES).catch("pt").default("pt"),
});

// POST /api/quizzes/[id]/grade-open
// Immediate AI feedback for one open answer during a practice quiz.
// Nothing is stored here — the authoritative grade is computed again when the
// attempt is submitted (POST /api/quizzes/[id]/attempts).
export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  const { id } = await params;
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { questionId, response, locale } = parsed.data;

  const plan = await getUserPlan(auth.user.id);
  const rateLimit = await checkRateLimit("grade", auth.user.id, plan);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 }
    );
  }

  // The question must be an open question of a quiz owned by this user
  const question = await prisma.quizQuestion.findFirst({
    where: {
      id: questionId,
      quizId: id,
      questionType: "OPEN_ANSWER",
      quiz: { document: { userId: auth.user.id } },
    },
    select: {
      id: true,
      questionText: true,
      explanation: true,
      quiz: { select: { documentId: true } },
    },
  });

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  try {
    const grade = await gradeOpenAnswer(
      {
        questionId: question.id,
        questionText: question.questionText,
        modelAnswer: question.explanation,
        response,
      },
      {
        userId: auth.user.id,
        documentId: question.quiz.documentId,
        language: localeToLanguage(locale),
      }
    );

    return NextResponse.json({
      score: grade.score,
      isCorrect: grade.score >= OPEN_ANSWER_CORRECT_THRESHOLD,
      feedback: grade.feedback,
    });
  } catch (err) {
    console.error("[grade-open] grading failed:", err);
    return NextResponse.json(
      { error: "Grading failed. Please try again." },
      { status: 502 }
    );
  }
}
