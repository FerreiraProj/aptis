"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Option = { id: string; text: string; isCorrect: boolean };
type Question = {
  id: string;
  questionText: string;
  questionType: string;
  explanation: string | null;
  difficulty: string;
  topic: string | null;
  points: number;
  options: Option[];
};
type Quiz = {
  id: string;
  title: string;
  quizType: string;
  passingScore: number;
  document: { id: string; title: string } | null;
  questions: Question[];
};

type AnswerState = {
  selectedOptionId: string | null;
  openResponse: string;
  submitted: boolean;
  isCorrect: boolean | null;
};

export function QuizPlayer({ quiz, userId }: { quiz: Quiz; userId: string }) {
  const t = useTranslations("quizzes");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [quizFinished, setQuizFinished] = useState(false);
  const [saving, setSaving] = useState(false);

  const question = quiz.questions[currentIdx];
  const answer = answers[question?.id] ?? {
    selectedOptionId: null,
    openResponse: "",
    submitted: false,
    isCorrect: null,
  };

  const isMultipleChoice =
    question?.questionType === "MULTIPLE_CHOICE" ||
    question?.questionType === "TRUE_FALSE";

  function selectOption(optionId: string) {
    if (answer.submitted) return;
    setAnswers((prev) => ({
      ...prev,
      [question.id]: { ...answer, selectedOptionId: optionId },
    }));
  }

  function submitAnswer() {
    if (answer.submitted) return;
    let isCorrect: boolean | null = null;
    if (isMultipleChoice && answer.selectedOptionId) {
      const opt = question.options.find((o) => o.id === answer.selectedOptionId);
      isCorrect = opt?.isCorrect ?? false;
    }
    setAnswers((prev) => ({
      ...prev,
      [question.id]: { ...answer, submitted: true, isCorrect },
    }));
  }

  function nextQuestion() {
    if (currentIdx < quiz.questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      finishQuiz();
    }
  }

  async function finishQuiz() {
    setSaving(true);
    try {
      const answersPayload = quiz.questions.map((q) => {
        const a = answers[q.id];
        return {
          questionId: q.id,
          selectedOptionIds: a?.selectedOptionId ? [a.selectedOptionId] : [],
          openResponse: a?.openResponse || null,
          isCorrect: a?.isCorrect ?? null,
        };
      });
      await fetch(`/api/quizzes/${quiz.id}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answersPayload }),
      });
    } catch {
      // non-blocking
    }
    setSaving(false);
    setQuizFinished(true);
  }

  // Results screen
  if (quizFinished) {
    const mcAnswers = quiz.questions.filter(
      (q) =>
        q.questionType === "MULTIPLE_CHOICE" || q.questionType === "TRUE_FALSE"
    );
    const correct = mcAnswers.filter((q) => answers[q.id]?.isCorrect).length;
    const total = mcAnswers.length;
    const score = total > 0 ? Math.round((correct / total) * 100) : null;
    const passed = score !== null ? score >= quiz.passingScore : null;

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card variant="glass" className="rounded-3xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">{t("score")}</CardTitle>
            <p className="text-muted-foreground">{quiz.title}</p>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {score !== null ? (
              <>
                <div className="text-6xl font-bold">{score}%</div>
                <div
                  className={`text-lg font-medium ${passed ? "text-green-600" : "text-red-500"}`}
                >
                  {passed ? t("passed") : t("failed")}
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("correctCount", { correct, total })}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">{t("openAnswerComplete")}</p>
            )}
            <div className="flex gap-3 justify-center pt-2">
              <Link href="/quizzes">
                <Button variant="outline">{t("viewAllQuizzes")}</Button>
              </Link>
              <Button
                onClick={() => {
                  setAnswers({});
                  setCurrentIdx(0);
                  setQuizFinished(false);
                }}
              >
                {t("repeatQuiz")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Review answers */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">{t("reviewAnswers")}</h2>
          {quiz.questions.map((q, idx) => {
            const a = answers[q.id];
            const isMC =
              q.questionType === "MULTIPLE_CHOICE" ||
              q.questionType === "TRUE_FALSE";
            return (
              <Card
                key={q.id}
                variant="glass-sm"
                className={
                  isMC && a
                    ? a.isCorrect
                      ? "ring-1 ring-green-400/60"
                      : "ring-1 ring-red-400/60"
                    : ""
                }
              >
                <CardContent className="pt-4 space-y-2">
                  <p className="text-sm font-medium">
                    {idx + 1}. {q.questionText}
                  </p>
                  {isMC && (
                    <div className="space-y-1">
                      {q.options.map((opt) => {
                        const selected = a?.selectedOptionId === opt.id;
                        return (
                          <div
                            key={opt.id}
                            className={`text-xs px-3 py-1.5 rounded ${
                              opt.isCorrect
                                ? "bg-green-100 text-green-800"
                                : selected
                                  ? "bg-red-100 text-red-800"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {opt.isCorrect ? "✓ " : selected ? "✗ " : "  "}
                            {opt.text}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {q.explanation && (
                    <p className="text-xs text-muted-foreground border-t pt-2">
                      {q.explanation}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // Quiz screen
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold line-clamp-1">{quiz.title}</h1>
          <span className="text-sm text-muted-foreground">
            {currentIdx + 1} / {quiz.questions.length}
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 w-full bg-white/30 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full btn-gradient transition-all"
            style={{
              width: `${((currentIdx + 1) / quiz.questions.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Question card */}
      <Card variant="glass" className="rounded-3xl">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 mb-1">
            {question.topic && (
              <Badge variant="secondary" className="text-xs">
                {question.topic}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground capitalize">
              {question.difficulty.toLowerCase()}
            </span>
          </div>
          <CardTitle className="text-base font-medium leading-relaxed">
            {question.questionText}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isMultipleChoice ? (
            <div className="space-y-2">
              {question.options.map((opt) => {
                const selected = answer.selectedOptionId === opt.id;
                let optClass =
                  "w-full text-left px-4 py-3 glass-sm rounded-xl text-sm transition-colors ";
                if (!answer.submitted) {
                  optClass += selected
                    ? "border border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                    : "border border-transparent hover:border-primary/40 hover:brightness-95 dark:hover:brightness-110";
                } else {
                  if (opt.isCorrect) {
                    optClass += "border border-green-400/60 bg-green-100/50 dark:bg-green-900/20 text-green-800 dark:text-green-400";
                  } else if (selected && !opt.isCorrect) {
                    optClass += "border border-red-400/60 bg-red-100/50 dark:bg-red-900/20 text-red-700 dark:text-red-400";
                  } else {
                    optClass += "border border-transparent text-muted-foreground";
                  }
                }
                return (
                  <button
                    key={opt.id}
                    className={optClass}
                    onClick={() => selectOption(opt.id)}
                    disabled={answer.submitted}
                  >
                    {answer.submitted && opt.isCorrect && "✓ "}
                    {answer.submitted && selected && !opt.isCorrect && "✗ "}
                    {opt.text}
                  </button>
                );
              })}
            </div>
          ) : (
            <textarea
              className="w-full min-h-[120px] glass-sm rounded-xl border border-white/30 dark:border-white/10 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 bg-transparent"
              placeholder={t("openAnswerPlaceholder")}
              value={answer.openResponse}
              onChange={(e) =>
                setAnswers((prev) => ({
                  ...prev,
                  [question.id]: { ...answer, openResponse: e.target.value },
                }))
              }
              disabled={answer.submitted}
            />
          )}

          {/* Explanation */}
          {answer.submitted && question.explanation && (
            <div className="glass-sm rounded-xl border-l-2 border-l-primary/50 px-4 py-3 text-sm">
              <span className="font-medium text-primary">{t("explanation")}</span>
              <span className="text-foreground/80">{question.explanation}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-2">
            {!answer.submitted ? (
              <Button
                onClick={submitAnswer}
                disabled={
                  isMultipleChoice
                    ? !answer.selectedOptionId
                    : !answer.openResponse.trim()
                }
              >
                {t("submit")}
              </Button>
            ) : (
              <Button onClick={nextQuestion} disabled={saving}>
                {currentIdx < quiz.questions.length - 1
                  ? t("next")
                  : saving
                    ? t("saving")
                    : t("viewResult")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
