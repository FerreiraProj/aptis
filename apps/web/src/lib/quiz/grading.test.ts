import { describe, expect, it } from "vitest";
import { gradeQuizAttempt, type GradableQuestion } from "./grading";

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

describe("gradeQuizAttempt", () => {
  it("grades MC/TF answers from the stored answer key", () => {
    const r = gradeQuizAttempt(
      questions,
      [
        { questionId: "q1", selectedOptionIds: ["q1b"] },
        { questionId: "q2", selectedOptionIds: ["q2f"] },
        { questionId: "q3", openResponse: "my answer" },
      ],
      50
    );
    expect(r.correctCount).toBe(1);
    expect(r.gradableCount).toBe(2);
    expect(r.score).toBe(50);
    expect(r.passed).toBe(true);
    expect(r.answers.find((a) => a.questionId === "q3")).toMatchObject({
      isCorrect: null,
      openResponse: "my answer",
    });
  });

  it("ignores a client-supplied isCorrect flag", () => {
    const r = gradeQuizAttempt(
      questions,
      // A tampered payload claiming a wrong answer is correct
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
    expect(r.answers[0].isCorrect).toBeNull();
  });

  it("does not accept 'select every option' as correct", () => {
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
        { questionId: "q1", selectedOptionIds: ["q1b"] },
        { questionId: "nope", selectedOptionIds: ["x"] },
      ],
      50
    );
    expect(r.answers).toHaveLength(1);
    expect(r.correctCount).toBe(1);
  });

  it("counts unanswered MC questions as wrong", () => {
    const r = gradeQuizAttempt(questions, [{ questionId: "q1", selectedOptionIds: ["q1b"] }], 60);
    expect(r.score).toBe(50);
    expect(r.passed).toBe(false);
  });

  it("returns a null score for open-answer-only quizzes", () => {
    const r = gradeQuizAttempt(
      [{ id: "o1", questionType: "OPEN_ANSWER", options: [] }],
      [{ questionId: "o1", openResponse: "text" }],
      50
    );
    expect(r.score).toBeNull();
    expect(r.passed).toBeNull();
  });
});
