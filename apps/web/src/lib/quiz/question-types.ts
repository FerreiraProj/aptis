/**
 * Shared quiz/question type definitions (pure, client- and server-safe).
 */

export const CHOICE_QUESTION_TYPES = [
  "MULTIPLE_CHOICE",
  "MULTIPLE_SELECT",
  "TRUE_FALSE",
] as const;

export type ChoiceQuestionType = (typeof CHOICE_QUESTION_TYPES)[number];
export type QuestionKind = ChoiceQuestionType | "OPEN_ANSWER";

/** Quiz types a user can request from the generator. */
export const GENERATABLE_QUIZ_TYPES = [
  "MULTIPLE_CHOICE",
  "MULTIPLE_SELECT",
  "TRUE_FALSE",
  "OPEN_ANSWER",
  "MIXED",
] as const;

export type GeneratableQuizType = (typeof GENERATABLE_QUIZ_TYPES)[number];

export const QUIZ_DIFFICULTIES = ["MIXED", "EASY", "MEDIUM", "HARD"] as const;
export type QuizDifficulty = (typeof QUIZ_DIFFICULTIES)[number];

/** Which question types each quiz type may contain. */
export const QUIZ_TYPE_QUESTION_TYPES: Record<GeneratableQuizType, QuestionKind[]> = {
  MULTIPLE_CHOICE: ["MULTIPLE_CHOICE"],
  MULTIPLE_SELECT: ["MULTIPLE_SELECT"],
  TRUE_FALSE: ["TRUE_FALSE"],
  OPEN_ANSWER: ["OPEN_ANSWER"],
  MIXED: ["MULTIPLE_CHOICE", "MULTIPLE_SELECT", "TRUE_FALSE", "OPEN_ANSWER"],
};

/** True for questions answered by picking option(s) (auto-graded). */
export function isChoiceQuestion(questionType: string): boolean {
  return (CHOICE_QUESTION_TYPES as readonly string[]).includes(questionType);
}

/** True for "select all that apply" questions (checkboxes). */
export function isMultiSelect(questionType: string): boolean {
  return questionType === "MULTIPLE_SELECT";
}
