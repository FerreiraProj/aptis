import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@aptis/database";
import { requireAuth, isAuthError } from "@/lib/auth/guards";
import { checkRateLimit, getUserPlan } from "@/lib/rate-limit";
import { generateFlashcards } from "@/lib/ai/flashcard-generator";
import { generateQuiz } from "@/lib/ai/quiz-generator";
import { AI_LOCALES, localeToLanguage } from "@/lib/ai/language";
import { getGenerationLimits } from "@/lib/plans";
import { GENERATABLE_QUIZ_TYPES, QUIZ_DIFFICULTIES } from "@/lib/quiz/question-types";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

// Long documents / big requests are generated in several parallel AI calls.
export const maxDuration = 300;

const GenerateBodySchema = z.object({
  type: z.enum(["flashcards", "quiz", "both"]).default("both"),
  /** Number of quiz questions (or flashcards when type = "flashcards") */
  count: z.coerce.number().int().min(1).max(200).optional(),
  /** Number of flashcards when type = "both" */
  flashcardCount: z.coerce.number().int().min(1).max(200).optional(),
  quizType: z.enum(GENERATABLE_QUIZ_TYPES).default("MULTIPLE_CHOICE"),
  difficulty: z.enum(QUIZ_DIFFICULTIES).default("MIXED"),
  locale: z.enum(AI_LOCALES).catch("pt").default("pt"),
});

const DEFAULT_QUESTIONS = 10;
const DEFAULT_FLASHCARDS = 20;

// POST /api/documents/[id]/generate
// Body: { type, count?, flashcardCount?, quizType?, difficulty?, locale? }
// Requested counts are clamped to the user's plan (getGenerationLimits).
export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  // Rate limit generation (plan-aware)
  const plan = await getUserPlan(auth.user.id);
  const rateLimit = await checkRateLimit("generate", auth.user.id, plan);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 }
    );
  }

  const { id } = await params;
  const parsed = GenerateBodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues.map((i) => i.message) },
      { status: 400 }
    );
  }
  const { type, count, flashcardCount, quizType, difficulty, locale } = parsed.data;
  const language = localeToLanguage(locale);

  // Fetch document
  const document = await prisma.document.findFirst({
    where: { id, userId: auth.user.id },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  if (document.status !== "READY") {
    return NextResponse.json(
      { error: "Document is not ready for generation" },
      { status: 400 }
    );
  }

  if (!document.extractedText) {
    return NextResponse.json(
      { error: "No extracted text available" },
      { status: 400 }
    );
  }

  const limits = getGenerationLimits(plan);
  const results: {
    flashcards?: number;
    quiz?: string;
    questions?: number;
  } = {};

  try {
    // Generate flashcards
    if (type === "flashcards" || type === "both") {
      const requested =
        (type === "flashcards" ? count : flashcardCount) ?? DEFAULT_FLASHCARDS;
      const flashcardTotal = Math.min(requested, limits.maxFlashcards);

      // Get user preferences
      const user = await prisma.user.findUnique({
        where: { id: auth.user.id },
        select: { preferredExplanationStyle: true },
      });

      const flashcards = await generateFlashcards({
        text: document.extractedText,
        count: flashcardTotal,
        userId: auth.user.id,
        subject: document.subject || "general",
        explanationStyle: user?.preferredExplanationStyle || "CONCISE",
        language,
      });

      // Save flashcards to DB
      await prisma.flashcard.createMany({
        data: flashcards.map((fc) => ({
          userId: auth.user.id,
          documentId: document.id,
          front: fc.front,
          back: fc.back,
          hint: fc.hint,
          topic: fc.topic,
          difficulty: fc.difficulty,
          tags: fc.tags,
          isGenerated: true,
        })),
      });

      results.flashcards = flashcards.length;
    }

    // Generate quiz
    if (type === "quiz" || type === "both") {
      const questionTotal = Math.min(count ?? DEFAULT_QUESTIONS, limits.maxQuestions);

      const quiz = await generateQuiz({
        text: document.extractedText,
        count: questionTotal,
        userId: auth.user.id,
        quizType,
        difficulty,
        subject: document.subject || "general",
        language,
      });

      // Save quiz to DB
      const savedQuiz = await prisma.quiz.create({
        data: {
          documentId: document.id,
          title: quiz.title,
          quizType,
          questions: {
            create: quiz.questions.map((q, idx) => ({
              questionIndex: idx,
              questionText: q.questionText,
              questionType: q.questionType,
              explanation: q.explanation,
              difficulty: q.difficulty,
              topic: q.topic,
              points: q.points,
              options: q.options
                ? {
                    create: q.options.map((opt, optIdx) => ({
                      optionIndex: optIdx,
                      text: opt.text,
                      isCorrect: opt.isCorrect,
                    })),
                  }
                : undefined,
            })),
          },
        },
      });

      results.quiz = savedQuiz.id;
      results.questions = quiz.questions.length;
    }
  } catch (error) {
    // Log the details server-side; don't leak internal/provider errors to the client.
    console.error("[generate] AI generation failed:", error);
    return NextResponse.json(
      { error: "AI generation failed. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ results });
}
