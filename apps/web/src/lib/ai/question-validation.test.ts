import { describe, expect, it } from "vitest";
import {
  validateGeneratedQuestion,
  validateGeneratedQuestions,
  type RawGeneratedQuestion,
} from "./question-validation";
import { QUIZ_TYPE_QUESTION_TYPES } from "@/lib/quiz/question-types";

const ALL = QUIZ_TYPE_QUESTION_TYPES.MIXED;

function q(partial: Partial<RawGeneratedQuestion>): RawGeneratedQuestion {
  return {
    questionText: "What is ATP?",
    questionType: "MULTIPLE_CHOICE",
    topic: "Biology",
    difficulty: "MEDIUM",
    explanation: "Because…",
    points: 1,
    options: [
      { text: "Energy currency", isCorrect: true },
      { text: "A protein", isCorrect: false },
      { text: "A lipid", isCorrect: false },
      { text: "A sugar", isCorrect: false },
    ],
    ...partial,
  };
}

const opts = (...correct: boolean[]) =>
  correct.map((isCorrect, i) => ({ text: `Option ${i + 1}`, isCorrect }));

describe("validateGeneratedQuestion", () => {
  it("keeps a well-formed multiple choice question", () => {
    expect(validateGeneratedQuestion(q({}), ALL)).not.toBeNull();
  });

  it("drops multiple choice with two correct options", () => {
    expect(validateGeneratedQuestion(q({ options: opts(true, true, false, false) }), ALL)).toBeNull();
  });

  it("drops multiple choice with no correct option", () => {
    expect(validateGeneratedQuestion(q({ options: opts(false, false, false, false) }), ALL)).toBeNull();
  });

  it("keeps multi-select with 2+ correct and 1+ wrong", () => {
    const r = validateGeneratedQuestion(
      q({ questionType: "MULTIPLE_SELECT", options: opts(true, true, false, false) }),
      ALL
    );
    expect(r?.questionType).toBe("MULTIPLE_SELECT");
  });

  it("drops multi-select with a single correct option", () => {
    expect(
      validateGeneratedQuestion(q({ questionType: "MULTIPLE_SELECT", options: opts(true, false, false, false) }), ALL)
    ).toBeNull();
  });

  it("drops multi-select where every option is correct", () => {
    expect(
      validateGeneratedQuestion(q({ questionType: "MULTIPLE_SELECT", options: opts(true, true, true) }), ALL)
    ).toBeNull();
  });

  it("requires exactly two options for true/false", () => {
    expect(
      validateGeneratedQuestion(q({ questionType: "TRUE_FALSE", options: opts(true, false) }), ALL)
    ).not.toBeNull();
    expect(
      validateGeneratedQuestion(q({ questionType: "TRUE_FALSE", options: opts(true, false, false) }), ALL)
    ).toBeNull();
  });

  it("normalises open answers to have no options but requires a model answer", () => {
    const ok = validateGeneratedQuestion(
      q({ questionType: "OPEN_ANSWER", options: opts(true, false), explanation: "Model answer" }),
      ALL
    );
    expect(ok?.options).toBeNull();
    expect(
      validateGeneratedQuestion(q({ questionType: "OPEN_ANSWER", options: null, explanation: "  " }), ALL)
    ).toBeNull();
  });

  it("drops question types that were not requested", () => {
    expect(validateGeneratedQuestion(q({}), QUIZ_TYPE_QUESTION_TYPES.OPEN_ANSWER)).toBeNull();
  });

  it("drops questions with duplicate or empty options", () => {
    expect(
      validateGeneratedQuestion(
        q({
          options: [
            { text: "Same", isCorrect: true },
            { text: "same", isCorrect: false },
            { text: "Other", isCorrect: false },
          ],
        }),
        ALL
      )
    ).toBeNull();
    // empty option text is removed; 3 remain → still valid
    const r = validateGeneratedQuestion(
      q({ options: [...opts(true, false, false), { text: "  ", isCorrect: false }] }),
      ALL
    );
    expect(r?.options).toHaveLength(3);
  });

  it("drops questions with empty text", () => {
    expect(validateGeneratedQuestion(q({ questionText: "   " }), ALL)).toBeNull();
  });
});

describe("validateGeneratedQuestions", () => {
  it("filters a batch, keeping only valid questions", () => {
    const out = validateGeneratedQuestions(
      [q({}), q({ options: opts(true, true, false) }), q({ questionType: "TRUE_FALSE", options: opts(false, true) })],
      ALL
    );
    expect(out.map((x) => x.questionType)).toEqual(["MULTIPLE_CHOICE", "TRUE_FALSE"]);
  });
});
