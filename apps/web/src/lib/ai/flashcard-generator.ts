import { generateObject } from "ai";
import { z } from "zod";
import { openai, MODELS } from "./client";
import { logApiUsage } from "./usage-logger";

const FlashcardSchema = z.object({
  flashcards: z
    .array(
      z.object({
        front: z.string().describe("The question, term or concept"),
        back: z.string().describe("The answer, definition or explanation"),
        hint: z.string().nullable().describe("Optional memory hint, or null"),
        topic: z.string().describe("The topic or chapter this belongs to"),
        difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
        tags: z.array(z.string()).describe("Relevant tags for filtering"),
      })
    )
    .min(1)
    .max(50),
});

export type GeneratedFlashcard = z.infer<
  typeof FlashcardSchema
>["flashcards"][0];

interface GenerateFlashcardsOptions {
  text: string;
  count?: number;
  userId: string;
  subject?: string;
  explanationStyle?: "CONCISE" | "DETAILED" | "VISUAL" | "ANALOGICAL";
}

export async function generateFlashcards(
  options: GenerateFlashcardsOptions
): Promise<GeneratedFlashcard[]> {
  const {
    text,
    count = 20,
    userId,
    subject = "medicine",
    explanationStyle = "CONCISE",
  } = options;

  const start = Date.now();

  const styleInstructions: Record<string, string> = {
    CONCISE: "Be brief and direct. One concept per card.",
    DETAILED:
      "Provide complete explanations with context and clinical relevance.",
    VISUAL: "Use analogies and mental images to make concepts memorable.",
    ANALOGICAL:
      "Explain using everyday analogies and comparisons to familiar concepts.",
  };

  const { object, usage } = await generateObject({
    model: openai(MODELS.MINI),
    schema: FlashcardSchema,
    system: `You are an expert medical educator creating flashcards for ${subject} students using spaced repetition.

Style: ${styleInstructions[explanationStyle]}

Rules:
- Test ONE concept per card (atomic knowledge)
- Front: clear question or term
- Back: precise answer, include clinical relevance when applicable
- Vary difficulty (30% easy, 50% medium, 20% hard)
- Use proper medical terminology
- Create practical, exam-relevant cards`,
    prompt: `Create ${count} high-quality study flashcards from this medical content:\n\n${text.slice(0, 8000)}`,
  });

  await logApiUsage({
    userId,
    feature: "FLASHCARD_GENERATION",
    model: MODELS.MINI,
    inputTokens: usage.inputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
    durationMs: Date.now() - start,
  });

  return object.flashcards;
}
