/**
 * Server-side quiz grading. The client's own `isCorrect` is never trusted:
 * correctness is recomputed from the options stored in the database, and open
 * answers are scored by the AI grader (passed in as `openGrades`).
 *
 * Pure — see grading.test.ts.
 */

import { isChoiceQuestion } from "./question-types";

export { isChoiceQuestion, isMultiSelect } from "./question-types";

export type GradableQuestion = {
  id: string;
  questionType: string; // MULTIPLE_CHOICE | MULTIPLE_SELECT | TRUE_FALSE | OPEN_ANSWER
  options: { id: string; isCorrect: boolean }[];
};

export type SubmittedAnswer = {
  questionId: string;
  selectedOptionIds?: string[];
  openResponse?: string | null;
};

/** AI grade for one open answer: score in [0, 1]. */
export type OpenGrade = { score: number; feedback: string };

export type GradedAnswer = {
  questionId: string;
  selectedOptionIds: string[];
  openResponse: string | null;
  /** true only for a full-marks answer; null when it could not be graded */
  isCorrect: boolean | null;
  /** 0–1; null when not graded (e.g. AI grading failed) */
  score: number | null;
  aiFeedback: string | null;
};

export type GradeResult = {
  answers: GradedAnswer[];
  /** Answers with full marks */
  correctCount: number;
  /** Questions that count towards the score */
  gradableCount: number;
  /** 0–100, rounded; null when nothing could be graded */
  score: number | null;
  passed: boolean | null;
};

const MAX_OPEN_RESPONSE_CHARS = 10_000;
/** An open answer at or above this score is shown as "correct". */
export const OPEN_ANSWER_CORRECT_THRESHOLD = 0.7;

/** @deprecated use isChoiceQuestion */
export const isAutoGraded = isChoiceQuestion;

/**
 * Score a choice question (0–1).
 * - MULTIPLE_CHOICE / TRUE_FALSE: 1 if the selection equals the correct set, else 0.
 * - MULTIPLE_SELECT: partial credit = (correct picked − wrong picked) / total correct, floored at 0.
 */
export function scoreChoiceQuestion(
  question: GradableQuestion,
  selectedIds: string[]
): number {
  const correctIds = new Set(question.options.filter((o) => o.isCorrect).map((o) => o.id));
  if (correctIds.size === 0) return 0;

  if (question.questionType === "MULTIPLE_SELECT") {
    let right = 0;
    let wrong = 0;
    for (const id of selectedIds) {
      if (correctIds.has(id)) right++;
      else wrong++;
    }
    return Math.max(0, (right - wrong) / correctIds.size);
  }

  return selectedIds.length === correctIds.size && selectedIds.every((id) => correctIds.has(id))
    ? 1
    : 0;
}

function clamp01(n: number): number {
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
}

/**
 * Grade a submission against the quiz's questions.
 *
 * - Answers for questions not in the quiz are dropped; duplicates keep the first.
 * - Selected option IDs that don't belong to the question are dropped.
 * - Every choice question counts (unanswered = 0).
 * - Open questions count with their AI score; blank = 0; AI failure = excluded.
 */
export function gradeQuizAttempt(
  questions: GradableQuestion[],
  submitted: SubmittedAnswer[],
  passingScore: number,
  openGrades: Map<string, OpenGrade> = new Map()
): GradeResult {
  const submittedById = new Map<string, SubmittedAnswer>();
  for (const raw of submitted) {
    if (raw && typeof raw.questionId === "string" && !submittedById.has(raw.questionId)) {
      submittedById.set(raw.questionId, raw);
    }
  }

  const answers: GradedAnswer[] = [];
  let correctCount = 0;
  let gradableCount = 0;
  let total = 0;

  for (const question of questions) {
    const raw = submittedById.get(question.id);

    const validOptionIds = new Set(question.options.map((o) => o.id));
    const selected = Array.from(
      new Set(
        (Array.isArray(raw?.selectedOptionIds) ? raw.selectedOptionIds : []).filter(
          (id): id is string => typeof id === "string" && validOptionIds.has(id)
        )
      )
    );
    const openResponse =
      typeof raw?.openResponse === "string" && raw.openResponse.trim()
        ? raw.openResponse.slice(0, MAX_OPEN_RESPONSE_CHARS)
        : null;

    let score: number | null;
    let aiFeedback: string | null = null;

    if (isChoiceQuestion(question.questionType)) {
      score = selected.length > 0 ? scoreChoiceQuestion(question, selected) : 0;
    } else if (!openResponse) {
      score = 0; // blank open answer
    } else {
      const grade = openGrades.get(question.id);
      score = grade ? clamp01(grade.score) : null; // null = grading unavailable
      aiFeedback = grade?.feedback ?? null;
    }

    const isCorrect =
      score === null
        ? null
        : isChoiceQuestion(question.questionType)
          ? score === 1
          : score >= OPEN_ANSWER_CORRECT_THRESHOLD;

    if (score !== null) {
      gradableCount++;
      total += score;
      if (isCorrect) correctCount++;
    }

    // Only persist questions the student actually saw an answer slot for
    if (raw) {
      answers.push({
        questionId: question.id,
        selectedOptionIds: selected,
        openResponse,
        isCorrect,
        score,
        aiFeedback,
      });
    }
  }

  const finalScore = gradableCount > 0 ? Math.round((total / gradableCount) * 100) : null;
  const passed = finalScore !== null ? finalScore >= passingScore : null;

  return { answers, correctCount, gradableCount, score: finalScore, passed };
}
