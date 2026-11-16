import { generateObject } from "ai";
import { z } from "zod";
import { openai, MODELS } from "./client";
import { logApiUsage } from "./usage-logger";
import { batchHint, planSegments, runForSegments, type SegmentPlan } from "./segments";
import { validateGeneratedQuestions, type ValidQuestion } from "./question-validation";
import {
  QUIZ_TYPE_QUESTION_TYPES,
  type GeneratableQuizType,
  type QuizDifficulty,
} from "@/lib/quiz/question-types";

const QuizSchema = z.object({
  title: z.string(),
  questions: z
    .array(
      z.object({
        questionText: z.string(),
        questionType: z.enum(["MULTIPLE_CHOICE", "MULTIPLE_SELECT", "TRUE_FALSE", "OPEN_ANSWER"]),
        topic: z.string(),
        difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
        explanation: z
          .string()
          .describe(
            "Why the answer is correct. For OPEN_ANSWER: a complete model answer listing the key points a full-marks answer must contain."
          ),
        options: z
          .array(
            z.object({
              text: z.string(),
              isCorrect: z.boolean(),
            })
          )
          .nullable()
          .describe("Options for MULTIPLE_CHOICE / MULTIPLE_SELECT / TRUE_FALSE, or null for OPEN_ANSWER"),
        points: z.number(),
      })
    )
    // Per-call bounds: long documents / big requests are split across several calls.
    .min(1)
    .max(30),
});

/** Max questions requested in a single model call (keeps output well under limits). */
const MAX_QUESTIONS_PER_CALL = 25;
/** Ask for a few extra to compensate for malformed questions we discard. */
const OVERSHOOT = 1.15;

export type GeneratedQuestion = ValidQuestion;

interface GenerateQuizOptions {
  text: string;
  count?: number;
  userId: string;
  quizType?: GeneratableQuizType;
  difficulty?: QuizDifficulty;
  subject?: string;
  language?: string;
}

const TYPE_INSTRUCTIONS: Record<GeneratableQuizType, (language: string) => string> = {
  MULTIPLE_CHOICE: () =>
    "Every question must have questionType MULTIPLE_CHOICE, exactly 4 options and exactly ONE correct option.",
  MULTIPLE_SELECT: () =>
    'Every question must have questionType MULTIPLE_SELECT ("select all that apply"): 4 to 6 options, AT LEAST TWO correct and AT LEAST ONE incorrect. Phrase the question so it is clear that more than one answer may be correct.',
  TRUE_FALSE: (language) =>
    `Every question must have questionType TRUE_FALSE: a clear, unambiguous statement with exactly 2 options — the words for "True" and "False" in ${language} — and exactly one correct.`,
  OPEN_ANSWER: () =>
    "Every question must have questionType OPEN_ANSWER with options = null. Questions should require explanation and synthesis. The explanation field MUST contain a complete model answer listing the key points a full-marks answer has to mention (it is used to grade students).",
  MIXED: (language) =>
    `Mix question types: about 40% MULTIPLE_CHOICE (4 options, exactly one correct), 20% MULTIPLE_SELECT (4-6 options, at least two correct and at least one incorrect), 15% TRUE_FALSE (2 options: "True"/"False" in ${language}, one correct) and 25% OPEN_ANSWER (options = null; explanation = complete model answer with the key points).`,
};

const DIFFICULTY_INSTRUCTIONS: Record<QuizDifficulty, string> = {
  MIXED: "Vary difficulty: about 30% EASY, 50% MEDIUM, 20% HARD.",
  EASY: "All questions must be EASY: core definitions and key facts, straightforward wording.",
  MEDIUM: "All questions must be MEDIUM: understanding and application of the main concepts.",
  HARD: "All questions must be HARD: application, analysis and edge cases, with subtle distractors.",
};

function normalizeKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function generateQuiz(
  options: GenerateQuizOptions
): Promise<{ title: string; questions: GeneratedQuestion[] }> {
  const {
    text,
    count = 10,
    userId,
    quizType = "MULTIPLE_CHOICE",
    difficulty = "MIXED",
    subject = "general",
    language = "English",
  } = options;

  const start = Date.now();
  // Open answers need deeper reasoning (and a good model answer) → standard model.
  const needsStrongModel = quizType === "OPEN_ANSWER" || quizType === "MIXED";
  const model = needsStrongModel ? MODELS.STANDARD : MODELS.MINI;
  const allowedTypes = QUIZ_TYPE_QUESTION_TYPES[quizType];

  const system = `You are creating a ${subject} exam for students.

${TYPE_INSTRUCTIONS[quizType](language)}

${DIFFICULTY_INSTRUCTIONS[difficulty]}

IMPORTANT: Write ALL content (questions, options, explanations, topics) in ${language}. Do not translate universally-used technical terms that are identical across languages (e.g. "DNA", "pH", "ATP"), but write all other text in ${language}.

Quality rules:
- Questions must be relevant to the subject matter and exam-style
- Include plausible distractors (common mistakes, similar-sounding terms)
- Explanations must explain WHY the answer is correct (not just restate it)
- Never use "all of the above" / "none of the above"
- Test application, not just recall`;

  // Cover the whole document: one call per segment (or batch), run in parallel.
  const generateForSegment = async (seg: SegmentPlan) => {
    const segStart = Date.now();
    const { object, usage } = await generateObject({
      model: openai(model),
      schema: QuizSchema,
      system,
      prompt: `Generate ${seg.count} exam questions based on this content (part ${seg.part} of ${seg.totalParts} of the document).${batchHint(seg)} The title should describe the document as a whole:\n\n${seg.text}`,
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
    planSegments(text, Math.ceil(count * OVERSHOOT), { maxPerCall: MAX_QUESTIONS_PER_CALL }),
    generateForSegment,
    "quiz"
  );

  const seen = new Set<string>();
  const unique = results
    .flatMap((r) => r.questions)
    .filter((q) => {
      const key = normalizeKey(q.questionText);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const valid = validateGeneratedQuestions(unique, allowedTypes);
  const questions = valid.slice(0, count);

  if (questions.length === 0) {
    throw new Error("Quiz generation produced no valid questions");
  }

  console.info(
    `[quiz] ${questions.length}/${count} ${quizType} questions (${unique.length - valid.length} discarded) from ${results.length} call(s) in ${Date.now() - start}ms`
  );

  return { title: results[0].title, questions };
}
