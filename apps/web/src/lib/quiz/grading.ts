/**
 * Server-side quiz grading. The client's own `isCorrect` is never trusted:
 * correctness is recomputed from the options stored in the database.
 */

export type GradableQuestion = {
  id: string;
  questionType: string; // MULTIPLE_CHOICE | TRUE_FALSE | OPEN_ANSWER
  options: { id: string; isCorrect: boolean }[];
};

export type SubmittedAnswer = {
  questionId: string;
  selectedOptionIds?: string[];
  openResponse?: string | null;
};

export type GradedAnswer = {
  questionId: string;
  selectedOptionIds: string[];
  openResponse: string | null;
  /** null = not auto-gradable (open answer) or unanswered */
  isCorrect: boolean | null;
};

export type GradeResult = {
  answers: GradedAnswer[];
  correctCount: number;
  /** Auto-gradable (MC / TF) questions in the quiz */
  gradableCount: number;
  /** 0–100, rounded; null when the quiz has no auto-gradable questions */
  score: number | null;
  passed: boolean | null;
};

const AUTO_GRADED_TYPES = new Set(["MULTIPLE_CHOICE", "TRUE_FALSE"]);
const MAX_OPEN_RESPONSE_CHARS = 10_000;

export function isAutoGraded(questionType: string): boolean {
  return AUTO_GRADED_TYPES.has(questionType);
}

/**
 * Grade a submission against the quiz's questions.
 *
 * - Answers for questions not in the quiz are dropped; duplicates keep the first.
 * - Selected option IDs that don't belong to the question are dropped.
 * - An MC/TF answer is correct when the selected set equals the set of correct options.
 * - Unanswered MC/TF questions count as wrong in the score (denominator = all MC/TF questions).
 */
export function gradeQuizAttempt(
  questions: GradableQuestion[],
  submitted: SubmittedAnswer[],
  passingScore: number
): GradeResult {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const seen = new Set<string>();
  const answers: GradedAnswer[] = [];
  let correctCount = 0;

  for (const raw of submitted) {
    const question = byId.get(raw?.questionId);
    if (!question || seen.has(question.id)) continue;
    seen.add(question.id);

    const validOptionIds = new Set(question.options.map((o) => o.id));
    const selected = Array.from(
      new Set(
        (Array.isArray(raw.selectedOptionIds) ? raw.selectedOptionIds : []).filter(
          (id): id is string => typeof id === "string" && validOptionIds.has(id)
        )
      )
    );

    let isCorrect: boolean | null = null;
    if (isAutoGraded(question.questionType) && selected.length > 0) {
      const correctIds = question.options.filter((o) => o.isCorrect).map((o) => o.id);
      isCorrect =
        correctIds.length === selected.length &&
        correctIds.every((id) => selected.includes(id));
      if (isCorrect) correctCount++;
    }

    answers.push({
      questionId: question.id,
      selectedOptionIds: selected,
      openResponse:
        typeof raw.openResponse === "string" && raw.openResponse.trim()
          ? raw.openResponse.slice(0, MAX_OPEN_RESPONSE_CHARS)
          : null,
      isCorrect,
    });
  }

  const gradableCount = questions.filter((q) => isAutoGraded(q.questionType)).length;
  const score =
    gradableCount > 0 ? Math.round((correctCount / gradableCount) * 100) : null;
  const passed = score !== null ? score >= passingScore : null;

  return { answers, correctCount, gradableCount, score, passed };
}
