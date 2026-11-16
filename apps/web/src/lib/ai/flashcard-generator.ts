import { generateObject } from "ai";
import { z } from "zod";
import { openai, MODELS } from "./client";
import { logApiUsage } from "./usage-logger";
import { batchHint, planSegments, runForSegments, type SegmentPlan } from "./segments";

/** Max flashcards requested in a single model call. */
const MAX_FLASHCARDS_PER_CALL = 40;

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
  language?: string;
}

function normalizeKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function generateFlashcards(
  options: GenerateFlashcardsOptions
): Promise<GeneratedFlashcard[]> {
  const {
    text,
    count = 20,
    userId,
    subject = "general",
    explanationStyle = "CONCISE",
    language = "English",
  } = options;

  const start = Date.now();

  const styleInstructions: Record<string, string> = {
    CONCISE: "Be brief and direct. One concept per card.",
    DETAILED:
      "Provide complete explanations with context and relevant examples.",
    VISUAL: "Use analogies and mental images to make concepts memorable.",
    ANALOGICAL:
      "Explain using everyday analogies and comparisons to familiar concepts.",
  };

  const system = `You are an expert educator creating flashcards for ${subject} students using spaced repetition.

Style: ${styleInstructions[explanationStyle]}

IMPORTANT: Write ALL content (front, back, hint, topic, tags) in ${language}. Do not translate universally-used technical terms that are identical across languages (e.g. "DNA", "pH", "ATP"), but write all other text in ${language}.

Rules:
- Test ONE concept per card (atomic knowledge)
- Front: clear question or term
- Back: precise answer with real-world relevance when applicable
- Vary difficulty (30% easy, 50% medium, 20% hard)
- Use precise terminology appropriate to the subject area
- Create practical, exam-relevant cards`;

  // Cover the whole document: one call per segment, run in parallel.
  const generateForSegment = async (seg: SegmentPlan) => {
    const segStart = Date.now();
    const { object, usage } = await generateObject({
      model: openai(MODELS.MINI),
      schema: FlashcardSchema,
      system,
      prompt: `Create ${seg.count} high-quality study flashcards from this content (part ${seg.part} of ${seg.totalParts} of the document).${batchHint(seg)}

Content:\n\n${seg.text}`,
    });

    await logApiUsage({
      userId,
      feature: "FLASHCARD_GENERATION",
      model: MODELS.MINI,
      inputTokens: usage.inputTokens ?? 0,
      outputTokens: usage.outputTokens ?? 0,
      durationMs: Date.now() - segStart,
    });

    return object.flashcards;
  };

  const batches = await runForSegments(
    planSegments(text, count, { maxPerCall: MAX_FLASHCARDS_PER_CALL }),
    generateForSegment,
    "flashcards"
  );

  // Merge, drop duplicate fronts, respect the requested count
  const seen = new Set<string>();
  const merged = batches.flat().filter((fc) => {
    const key = normalizeKey(fc.front);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.info(
    `[flashcards] ${merged.length}/${count} cards from ${batches.length} segment(s) in ${Date.now() - start}ms`
  );

  return merged.slice(0, count);
}
