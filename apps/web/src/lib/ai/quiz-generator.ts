import { generateObject } from "ai";
import { z } from "zod";
import { openai, MODELS } from "./client";
import { logApiUsage } from "./usage-logger";
import { planSegments, runForSegments, type SegmentPlan } from "./segments";

const QuizSchema = z.object({
  title: z.string(),
  questions: z
    .array(
      z.object({
        questionText: z.string(),
        questionType: z.enum(["MULTIPLE_CHOICE", "TRUE_FALSE", "OPEN_ANSWER"]),
        topic: z.string(),
        difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
        explanation: z.string().describe("Explanation shown after answering"),
        options: z
          .array(
            z.object({
              text: z.string(),
              isCorrect: z.boolean(),
            })
          )
          .nullable()
          .describe("Options for MULTIPLE_CHOICE/TRUE_FALSE, or null for OPEN_ANSWER"),
        points: z.number(),
      })
    )
    // Per-call bounds: long documents are split across several calls,
    // so one segment may legitimately ask for only a few questions.
    .min(1)
    .max(30),
});

export type GeneratedQuestion = z.infer<typeof QuizSchema>["questions"][0];

interface GenerateQuizOptions {
  text: string;
  count?: number;
  userId: string;
  quizType?: "MULTIPLE_CHOICE" | "OPEN_ANSWER" | "MIXED";
  subject?: string;
  language?: string;
}

function normalizeKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function generateQuiz(
  options: GenerateQuizOptions
): Promise<z.infer<typeof QuizSchema>> {
  const {
    text,
    count = 10,
    userId,
    quizType = "MULTIPLE_CHOICE",
    subject = "general",
    language = "English",
  } = options;

  const start = Date.now();
  const useSimpleModel = quizType === "MULTIPLE_CHOICE";
  const model = useSimpleModel ? MODELS.MINI : MODELS.STANDARD;

  const typeInstructions =
    quizType === "MULTIPLE_CHOICE"
      ? "Create multiple choice questions with 4 options (A-D), exactly one correct answer."
      : quizType === "OPEN_ANSWER"
        ? "Create open-ended questions that require explanation, requiring synthesis of knowledge."
        : "Mix multiple choice (60%) and open-answer (40%) questions.";

  const system = `You are creating a ${subject} exam for students.

${typeInstructions}

IMPORTANT: Write ALL content (questions, options, explanations, topics) in ${language}. Do not translate universally-used technical terms that are identical across languages (e.g. "DNA", "pH", "ATP"), but write all other text in ${language}.

Quality rules:
- Questions must be relevant to the subject matter and exam-style
- Include plausible distractors for MC (common mistakes, similar-sounding terms)
- Explanations must explain WHY the answer is correct (not just restate it)
- Vary difficulty appropriately
- Test application, not just recall`;

  // Cover the whole document: one call per segment, run in parallel.
  const generateForSegment = async (seg: SegmentPlan) => {
    const segStart = Date.now();
    const { object, usage } = await generateObject({
      model: openai(model),
      schema: QuizSchema,
      system,
      prompt: `Generate ${seg.count} exam questions based on this content (part ${seg.part} of ${seg.totalParts} of the document). The title should describe the document as a whole:\n\n${seg.text}`,
    });

    await logApiUsage({
      userId,
      feature: "QUIZ_GENERATION",
      model,
      inputTokens: usage.inputTokens ?? 0,
      outputTokens: usage.outputTokens ?? 0,
      durationMs: Date.now() - segStart,
    });

    return object;
  };

  const results = await runForSegments(
    planSegments(text, count),
    generateForSegment,
    "quiz"
  );

  const seen = new Set<string>();
  const questions = results
    .flatMap((r) => r.questions)
    .filter((q) => {
      const key = normalizeKey(q.questionText);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, count);

  console.info(
    `[quiz] ${questions.length}/${count} questions from ${results.length} segment(s) in ${Date.now() - start}ms`
  );

  return { title: results[0].title, questions };
}
