"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Loader2, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { isChoiceQuestion, isMultiSelect, scoreChoiceQuestion } from "@/lib/quiz/grading";

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
  selectedOptionIds: string[];
  openResponse: string;
  submitted: boolean;
  /** 0–1 */
  score: number | null;
  isCorrect: boolean | null;
  feedback: string | null;
  grading: boolean;
  gradingFailed: boolean;
};

type ServerResult = {
  score: number | null;
  passed: boolean | null;
  correctCount: number;
  gradableCount: number;
  ungradedOpenCount: number;
  answers: Record<string, { isCorrect: boolean | null; score: number | null; aiFeedback: string | null }>;
};

const EMPTY_ANSWER: AnswerState = {
  selectedOptionIds: [],
  openResponse: "",
  submitted: false,
  score: null,
  isCorrect: null,
  feedback: null,
  grading: false,
  gradingFailed: false,
};

function pct(score: number): number {
  return Math.round(score * 100);
}

export function QuizPlayer({ quiz }: { quiz: Quiz; userId: string }) {
  const t = useTranslations("quizzes");
  const locale = useLocale();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [quizFinished, setQuizFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverResult, setServerResult] = useState<ServerResult | null>(null);

  const question = quiz.questions[currentIdx];
  const answer = answers[question?.id] ?? EMPTY_ANSWER;
  const isChoice = isChoiceQuestion(question?.questionType ?? "");
  const multi = isMultiSelect(question?.questionType ?? "");

  function patchAnswer(questionId: string, patch: Partial<AnswerState>) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...(prev[questionId] ?? EMPTY_ANSWER), ...patch },
    }));
  }

  function toggleOption(optionId: string) {
    if (answer.submitted) return;
    const selected = multi
      ? answer.selectedOptionIds.includes(optionId)
        ? answer.selectedOptionIds.filter((id) => id !== optionId)
        : [...answer.selectedOptionIds, optionId]
      : [optionId];
    patchAnswer(question.id, { selectedOptionIds: selected });
  }

  async function submitAnswer() {
    if (answer.submitted || answer.grading) return;

    if (isChoice) {
      const score = scoreChoiceQuestion(question, answer.selectedOptionIds);
      patchAnswer(question.id, { submitted: true, score, isCorrect: score === 1 });
      return;
    }

    // Open answer → immediate AI feedback (the final grade is recomputed on submit)
    const qid = question.id;
    patchAnswer(qid, { grading: true });
    try {
      const res = await fetch(`/api/quizzes/${quiz.id}/grade-open`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: qid, response: answer.openResponse, locale }),
      });
      if (!res.ok) throw new Error();
      const data: { score: number; isCorrect: boolean; feedback: string } = await res.json();
      patchAnswer(qid, {
        grading: false,
        submitted: true,
        score: data.score,
        isCorrect: data.isCorrect,
        feedback: data.feedback,
      });
    } catch {
      patchAnswer(qid, { grading: false, submitted: true, gradingFailed: true });
    }
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
          selectedOptionIds: a?.selectedOptionIds ?? [],
          openResponse: a?.openResponse || null,
        };
      });
      const res = await fetch(`/api/quizzes/${quiz.id}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answersPayload, locale }),
      });
      if (res.ok) {
        const data = await res.json();
        setServerResult({
          score: data.attempt?.score ?? null,
          passed: data.attempt?.passed ?? null,
          correctCount: data.correctCount ?? 0,
          gradableCount: data.gradableCount ?? 0,
          ungradedOpenCount: data.ungradedOpenCount ?? 0,
          answers: Object.fromEntries(
            (data.answers ?? []).map(
              (a: { questionId: string; isCorrect: boolean | null; score: number | null; aiFeedback: string | null }) => [
                a.questionId,
                a,
              ]
            )
          ),
        });
      }
    } catch {
      // non-blocking — fall back to the locally computed result
    }
    setSaving(false);
    setQuizFinished(true);
  }

  function restart() {
    setAnswers({});
    setServerResult(null);
    setCurrentIdx(0);
    setQuizFinished(false);
  }

  // ── Results screen ────────────────────────────────────────────────────────
  if (quizFinished) {
    // Prefer the server's authoritative grade; fall back to local scores.
    const local = (() => {
      const scores = quiz.questions
        .map((q) => answers[q.id]?.score ?? (isChoiceQuestion(q.questionType) ? 0 : null))
        .filter((s): s is number => s !== null);
      const correct = quiz.questions.filter((q) => answers[q.id]?.isCorrect).length;
      const score = scores.length
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100)
        : null;
      return { score, correct, total: scores.length };
    })();

    const score = serverResult ? serverResult.score : local.score;
    const correct = serverResult ? serverResult.correctCount : local.correct;
    const total = serverResult ? serverResult.gradableCount : local.total;
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
            {serverResult && serverResult.ungradedOpenCount > 0 && (
              <p className="text-xs text-amber-600">
                {t("ungradedNote", { count: serverResult.ungradedOpenCount })}
              </p>
            )}
            <div className="flex gap-3 justify-center pt-2">
              <Link href="/quizzes">
                <Button variant="outline">{t("viewAllQuizzes")}</Button>
              </Link>
              <Button onClick={restart}>{t("repeatQuiz")}</Button>
            </div>
          </CardContent>
        </Card>

        {/* Review answers */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">{t("reviewAnswers")}</h2>
          {quiz.questions.map((q, idx) => {
            const a = answers[q.id];
            const server = serverResult?.answers[q.id];
            const qScore = server?.score ?? a?.score ?? null;
            const qCorrect = server?.isCorrect ?? a?.isCorrect ?? null;
            const feedback = server?.aiFeedback ?? a?.feedback ?? null;
            const choice = isChoiceQuestion(q.questionType);
            const partial = qScore !== null && qScore > 0 && qScore < 1;
            return (
              <Card
                key={q.id}
                variant="glass-sm"
                className={
                  qCorrect === null
                    ? ""
                    : qCorrect
                      ? "ring-1 ring-green-400/60"
                      : partial
                        ? "ring-1 ring-amber-400/60"
                        : "ring-1 ring-red-400/60"
                }
              >
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <p className="text-sm font-medium flex-1">
                      {idx + 1}. {q.questionText}
                    </p>
                    {qScore !== null && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {pct(qScore)}%
                      </span>
                    )}
                  </div>
                  {choice && (
                    <div className="space-y-1">
                      {q.options.map((opt) => {
                        const selected = a?.selectedOptionIds.includes(opt.id);
                        return (
                          <div
                            key={opt.id}
                            className={`text-xs px-3 py-1.5 rounded ${
                              opt.isCorrect
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                : selected
                                  ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
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
                  {!choice && a?.openResponse && (
                    <p className="text-xs italic text-muted-foreground">“{a.openResponse}”</p>
                  )}
                  {feedback && <AiFeedbackBox label={t("aiFeedback")} text={feedback} />}
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

  // ── Quiz screen ───────────────────────────────────────────────────────────
  const partial = answer.score !== null && answer.score > 0 && answer.score < 1;
  const canSubmit = isChoice
    ? answer.selectedOptionIds.length > 0
    : answer.openResponse.trim().length > 0;

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
          {multi && (
            <p className="text-xs font-medium text-primary pt-1">{t("selectAllCorrect")}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {isChoice ? (
            <div className="space-y-2" role={multi ? "group" : "radiogroup"}>
              {question.options.map((opt) => {
                const selected = answer.selectedOptionIds.includes(opt.id);
                let optClass =
                  "w-full text-left px-4 py-3 glass-sm rounded-xl text-sm transition-colors flex items-center gap-3 ";
                if (!answer.submitted) {
                  optClass += selected
                    ? "border border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                    : "border border-transparent hover:border-primary/40 hover:brightness-95 dark:hover:brightness-110";
                } else if (opt.isCorrect) {
                  optClass += "border border-green-400/60 bg-green-100/50 dark:bg-green-900/20 text-green-800 dark:text-green-400";
                } else if (selected) {
                  optClass += "border border-red-400/60 bg-red-100/50 dark:bg-red-900/20 text-red-700 dark:text-red-400";
                } else {
                  optClass += "border border-transparent text-muted-foreground";
                }
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role={multi ? "checkbox" : "radio"}
                    aria-checked={selected}
                    className={optClass}
                    onClick={() => toggleOption(opt.id)}
                    disabled={answer.submitted}
                  >
                    <SelectMark multi={multi} selected={selected} />
                    <span className="flex-1">
                      {answer.submitted && opt.isCorrect && "✓ "}
                      {answer.submitted && selected && !opt.isCorrect && "✗ "}
                      {opt.text}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <textarea
              className="w-full min-h-[120px] glass-sm rounded-xl border border-white/30 dark:border-white/10 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 bg-transparent"
              placeholder={t("openAnswerPlaceholder")}
              value={answer.openResponse}
              onChange={(e) => patchAnswer(question.id, { openResponse: e.target.value })}
              disabled={answer.submitted || answer.grading}
              maxLength={10_000}
            />
          )}

          {/* Result line */}
          {answer.submitted && answer.score !== null && (
            <p
              className={`text-sm font-medium ${
                answer.isCorrect ? "text-green-600" : partial ? "text-amber-600" : "text-red-500"
              }`}
            >
              {answer.isCorrect ? t("correct") : partial ? t("partial") : t("incorrect")}
              {(partial || !isChoice) && ` · ${t("aiScore", { percent: pct(answer.score) })}`}
            </p>
          )}

          {/* AI feedback (open answers) */}
          {answer.grading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" /> {t("grading")}
            </p>
          )}
          {answer.feedback && <AiFeedbackBox label={t("aiFeedback")} text={answer.feedback} />}
          {answer.gradingFailed && (
            <p className="text-xs text-amber-600">{t("gradingFailed")}</p>
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
              <Button onClick={submitAnswer} disabled={!canSubmit || answer.grading}>
                {answer.grading ? <Loader2 size={16} className="animate-spin" /> : t("submit")}
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

function SelectMark({ multi, selected }: { multi: boolean; selected: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex h-4 w-4 shrink-0 items-center justify-center border ${
        multi ? "rounded" : "rounded-full"
      } ${selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"}`}
    >
      {selected && (multi ? <Check size={12} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />)}
    </span>
  );
}

function AiFeedbackBox({ label, text }: { label: string; text: string }) {
  return (
    <div className="glass-sm rounded-xl border-l-2 border-l-violet-400/70 px-4 py-3 text-sm space-y-1">
      <p className="flex items-center gap-1.5 font-medium text-violet-600 dark:text-violet-400">
        <Sparkles size={14} /> {label}
      </p>
      <p className="text-foreground/80 whitespace-pre-line">{text}</p>
    </div>
  );
}
