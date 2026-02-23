import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@aptis/database";
import { requireAuth, isAuthError } from "@/lib/auth/guards";
import { checkRateLimit } from "@/lib/rate-limit";
import { generateFlashcards } from "@/lib/ai/flashcard-generator";
import { generateQuiz } from "@/lib/ai/quiz-generator";
import type { PlanTier } from "@aptis/database";
import { PLAN_LIMITS } from "@/lib/constants";

type Params = { params: Promise<{ id: string }> };

// POST /api/documents/[id]/generate
// Body: { type: "flashcards" | "quiz" | "both", count?: number, quizType?: string }
export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  // Rate limit generation
  const rateLimit = await checkRateLimit("generate", auth.user.id);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 }
    );
  }

  const { id } = await params;
  const body = await request.json();
  const { type = "both", count, quizType = "MULTIPLE_CHOICE" } = body;

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

  // Get user's plan
  const subscription = await prisma.subscription.findUnique({
    where: { userId: auth.user.id },
    select: { plan: true },
  });
  const planTier: PlanTier = subscription?.plan || "FREE";
  const limits = PLAN_LIMITS[planTier];

  const results: { flashcards?: number; quiz?: string } = {};

  // Generate flashcards
  if (type === "flashcards" || type === "both") {
    const flashcardCount = Math.min(
      count || 20,
      limits.flashcardsPerDocument === Infinity
        ? 50
        : limits.flashcardsPerDocument
    );

    // Get user preferences
    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { preferredExplanationStyle: true },
    });

    const flashcards = await generateFlashcards({
      text: document.extractedText,
      count: flashcardCount,
      userId: auth.user.id,
      subject: document.subject || "medicine",
      explanationStyle: user?.preferredExplanationStyle || "CONCISE",
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
    const quizCount = Math.min(
      count || 10,
      limits.quizzesPerDocument === Infinity ? 30 : limits.quizzesPerDocument
    );

    const quiz = await generateQuiz({
      text: document.extractedText,
      count: quizCount,
      userId: auth.user.id,
      quizType: quizType as "MULTIPLE_CHOICE" | "OPEN_ANSWER" | "MIXED",
      subject: document.subject || "medicine",
    });

    // Save quiz to DB
    const savedQuiz = await prisma.quiz.create({
      data: {
        documentId: document.id,
        title: quiz.title,
        quizType: quizType as never,
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
  }

  return NextResponse.json({ results });
}
