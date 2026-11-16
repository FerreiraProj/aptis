import { describe, expect, it } from "vitest";
import {
  gradeQuizAttempt,
  scoreChoiceQuestion,
  type GradableQuestion,
  type OpenGrade,
} from "./grading";

const questions: GradableQuestion[] = [
  {
    id: "q1",
    questionType: "MULTIPLE_CHOICE",
    options: [
      { id: "q1a", isCorrect: false },
      { id: "q1b", isCorrect: true },
      { id: "q1c", isCorrect: false },
    ],
  },
  {
    id: "q2",
    questionType: "TRUE_FALSE",
    options: [
      { id: "q2t", isCorrect: true },
      { id: "q2f", isCorrect: false },
    ],
  },
  { id: "q3", questionType: "OPEN_ANSWER", options: [] },
];

const multiSelect: GradableQuestion = {
  id: "ms",
  questionType: "MULTIPLE_SELECT",
  options: [
    { id: "a", isCorrect: true },
    { id: "b", isCorrect: true },
    { id: "c", isCorrect: true },
    { id: "d", isCorrect: false },
    { id: "e", isCorrect: false },
  ],
};

describe("scoreChoiceQuestion", () => {
  it("scores single-answer questions all-or-nothing", () => {
    expect(scoreChoiceQuestion(questions[0], ["q1b"])).toBe(1);
    expect(scoreChoiceQuestion(questions[0], ["q1a"])).toBe(0);
    expect(scoreChoiceQuestion(questions[0], ["q1a", "q1b"])).toBe(0);
  });

  it("gives full marks for a complete multi-select answer", () => {
    expect(scoreChoiceQuestion(multiSelect, ["a", "b", "c"])).toBe(1);
  });

  it("gives partial credit for a partially correct multi-select answer", () => {
    expect(scoreChoiceQuestion(multiSelect, ["a", "b"])).toBeCloseTo(2 / 3);
  });

  it("subtracts wrong picks in multi-select", () => {
    expect(scoreChoiceQuestion(multiSelect, ["a", "b", "d"])).toBeCloseTo(1 / 3);
  });

  it("never goes below zero", () => {
    expect(scoreChoiceQuestion(multiSelect, ["a", "d", "e"])).toBe(0);
    expect(scoreChoiceQuestion(multiSelect, ["a", "b", "c", "d", "e"])).toBeCloseTo(1 / 3);
  });
});

describe("gradeQuizAttempt", () => {
  it("grades choice answers from the stored answer key", () => {
    const r = gradeQuizAttempt(
      questions,
      [
        { questionId: "q1", selectedOptionIds: ["q1b"] },
        { questionId: "q2", selectedOptionIds: ["q2f"] },
        { questionId: "q3", openResponse: "my answer" },
      ],
      50
    );
    // open answer without an AI grade is excluded from the score
    expect(r.gradableCount).toBe(2);
    expect(r.correctCount).toBe(1);
    expect(r.score).toBe(50);
    expect(r.passed).toBe(true);
    expect(r.answers.find((a) => a.questionId === "q3")).toMatchObject({
      isCorrect: null,
      score: null,
      openResponse: "my answer",
    });
  });

  it("ignores a client-supplied isCorrect flag", () => {
    const r = gradeQuizAttempt(
      questions,
      [{ questionId: "q1", selectedOptionIds: ["q1a"], isCorrect: true } as never],
      50
    );
    expect(r.answers[0].isCorrect).toBe(false);
    expect(r.score).toBe(0);
  });

  it("drops option IDs that belong to another question", () => {
    const r = gradeQuizAttempt(
      questions,
      [{ questionId: "q1", selectedOptionIds: ["q2t"] }],
      50
    );
    expect(r.answers[0].selectedOptionIds).toEqual([]);
    expect(r.answers[0].isCorrect).toBe(false);
  });

  it("does not accept 'select every option' on single-answer questions", () => {
    const r = gradeQuizAttempt(
      questions,
      [{ questionId: "q1", selectedOptionIds: ["q1a", "q1b", "q1c"] }],
      50
    );
    expect(r.answers[0].isCorrect).toBe(false);
  });

  it("drops unknown questions and duplicate answers", () => {
    const r = gradeQuizAttempt(
      questions,
      [
        { questionId: "q1", selectedOptionIds: ["q1b"] },
        { questionId: "q1", selectedOptionIds: ["q1a"] },
        { questionId: "nope", selectedOptionIds: ["x"] },
      ],
      50
    );
    expect(r.answers).toHaveLength(1);
    expect(r.answers[0].isCorrect).toBe(true);
  });

  it("counts unanswered questions (choice and open) as zero", () => {
    const r = gradeQuizAttempt(questions, [{ questionId: "q1", selectedOptionIds: ["q1b"] }], 60);
    expect(r.gradableCount).toBe(3);
    expect(r.score).toBe(33);
    expect(r.passed).toBe(false);
  });

  it("uses AI grades for open answers, with partial credit", () => {
    const grades = new Map<string, OpenGrade>([["q3", { score: 0.5, feedback: "Missing X" }]]);
    const r = gradeQuizAttempt(
      questions,
      [
        { questionId: "q1", selectedOptionIds: ["q1b"] },
        { questionId: "q2", selectedOptionIds: ["q2t"] },
        { questionId: "q3", openResponse: "partly right" },
      ],
      70,
      grades
    );
    expect(r.score).toBe(83); // (1 + 1 + 0.5) / 3
    expect(r.correctCount).toBe(2);
    expect(r.answers.find((a) => a.questionId === "q3")).toMatchObject({
      score: 0.5,
      isCorrect: false,
      aiFeedback: "Missing X",
    });
  });

  it("treats a high AI score as correct and clamps out-of-range scores", () => {
    const grades = new Map<string, OpenGrade>([["q3", { score: 1.7, feedback: "Great" }]]);
    const r = gradeQuizAttempt(
      [questions[2]],
      [{ questionId: "q3", openResponse: "complete answer" }],
      70,
      grades
    );
    expect(r.answers[0]).toMatchObject({ score: 1, isCorrect: true });
    expect(r.score).toBe(100);
  });

  it("averages partial multi-select credit into the score", () => {
    const r = gradeQuizAttempt([multiSelect], [{ questionId: "ms", selectedOptionIds: ["a", "b"] }], 50);
    expect(r.score).toBe(67);
    expect(r.correctCount).toBe(0);
    expect(r.answers[0].isCorrect).toBe(false);
    expect(r.answers[0].score).toBeCloseTo(2 / 3);
  });

  it("returns a null score when nothing could be graded", () => {
    const r = gradeQuizAttempt(
      [{ id: "o1", questionType: "OPEN_ANSWER", options: [] }],
      [{ questionId: "o1", openResponse: "text" }],
      50
    );
    expect(r.score).toBeNull();
    expect(r.passed).toBeNull();
  });
});
