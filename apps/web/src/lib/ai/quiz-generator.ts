import { generateObject } from "ai";
import { z } from "zod";
import { anthropic, MODELS } from "./client";
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
          .optional()
          .describe("Required for MULTIPLE_CHOICE and TRUE_FALSE"),
        points: z.number().default(1),
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
  } = options;

  const start = Date.now();
  const useHaiku = quizType === "MULTIPLE_CHOICE";
  const model = useHaiku ? MODELS.HAIKU : MODELS.SONNET;

  const typeInstructions =
    quizType === "MULTIPLE_CHOICE"
      ? "Create multiple choice questions with 4 options (A-D), exactly one correct answer."
      : quizType === "OPEN_ANSWER"
        ? "Create open-ended questions that require explanation, requiring synthesis of knowledge."
        : "Mix multiple choice (60%) and open-answer (40%) questions.";

  const { object, usage } = await generateObject({
    model: anthropic(model),
    schema: QuizSchema,
    system: `You are creating a ${subject} exam for medical students.

${typeInstructions}

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
    inputTokens: usage.promptTokens,
    outputTokens: usage.completionTokens,
    durationMs: Date.now() - start,
  });

  return object;
}
