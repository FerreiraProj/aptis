/**
 * Sanity checks for AI-generated quiz questions. The model occasionally returns
 * malformed items (e.g. a multiple-choice question with two correct options);
 * those are dropped rather than shown to students. Pure — see question-validation.test.ts.
 */

import type { QuestionKind } from "@/lib/quiz/question-types";

export type RawGeneratedQuestion = {
  questionText: string;
  questionType: string;
  topic: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  explanation: string;
  options: { text: string; isCorrect: boolean }[] | null;
  points: number;
};

export type ValidQuestion = Omit<RawGeneratedQuestion, "questionType"> & {
  questionType: QuestionKind;
};

function countCorrect(options: { isCorrect: boolean }[]): number {
  return options.filter((o) => o.isCorrect).length;
}

/**
 * Returns the cleaned question, or null when it should be discarded.
 */
export function validateGeneratedQuestion(
  q: RawGeneratedQuestion,
  allowedTypes: readonly QuestionKind[]
): ValidQuestion | null {
  const type = q.questionType as QuestionKind;
  if (!allowedTypes.includes(type)) return null;

  const questionText = q.questionText?.trim();
  if (!questionText) return null;

  const base = { ...q, questionText, questionType: type };

  if (type === "OPEN_ANSWER") {
    // The explanation is the model answer used for AI grading — it must exist.
    if (!q.explanation?.trim()) return null;
    return { ...base, options: null };
  }

  const options = (q.options ?? [])
    .map((o) => ({ text: o.text?.trim() ?? "", isCorrect: !!o.isCorrect }))
    .filter((o) => o.text.length > 0);

  // Duplicate option texts make the question ambiguous
  const distinct = new Set(options.map((o) => o.text.toLowerCase()));
  if (distinct.size !== options.length) return null;

  const correct = countCorrect(options);

  switch (type) {
    case "MULTIPLE_CHOICE":
      if (options.length < 3 || options.length > 6 || correct !== 1) return null;
      break;
    case "TRUE_FALSE":
      if (options.length !== 2 || correct !== 1) return null;
      break;
    case "MULTIPLE_SELECT":
      // at least 2 correct and at least 1 wrong, otherwise it's not a real "select all"
      if (options.length < 3 || options.length > 8 || correct < 2 || correct === options.length) {
        return null;
      }
      break;
  }

  return { ...base, options };
}

export function validateGeneratedQuestions(
  questions: RawGeneratedQuestion[],
  allowedTypes: readonly QuestionKind[]
): ValidQuestion[] {
  return questions
    .map((q) => validateGeneratedQuestion(q, allowedTypes))
    .filter((q): q is ValidQuestion => q !== null);
}
