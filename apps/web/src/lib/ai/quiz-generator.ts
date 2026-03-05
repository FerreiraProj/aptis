import { generateObject } from "ai";
import { z } from "zod";
import { openai, MODELS } from "./client";
import { logApiUsage } from "./usage-logger";

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
    .min(5)
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

export async function generateQuiz(
  options: GenerateQuizOptions
): Promise<z.infer<typeof QuizSchema>> {
  const {
    text,
    count = 10,
    userId,
    quizType = "MULTIPLE_CHOICE",
    subject = "medicine",
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

  const { object, usage } = await generateObject({
    model: openai(model),
    schema: QuizSchema,
    system: `You are creating a ${subject} exam for medical students.

${typeInstructions}

IMPORTANT: Write ALL content (questions, options, explanations, topics) in ${language}. Do not translate universally-used medical/scientific terms that are the same across languages (e.g. "DNA", "pH", "ATP"), but write all other text in ${language}.

Quality rules:
- Questions must be clinically relevant and exam-style
- Include plausible distractors for MC (common mistakes, similar-sounding terms)
- Explanations must explain WHY the answer is correct (not just restate it)
- Vary difficulty appropriately
- Test application, not just recall`,
    prompt: `Generate ${count} exam questions based on this medical content:\n\n${text.slice(0, 10000)}`,
  });

  await logApiUsage({
    userId,
    feature: "QUIZ_GENERATION",
    model,
    inputTokens: usage.inputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
    durationMs: Date.now() - start,
  });

  return object;
}
