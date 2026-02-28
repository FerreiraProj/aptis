"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  timeLimit: number | null;
  questions: Question[];
};

type ExamAnswer = {
  selectedOptionId: string | null;
  openResponse: string;
};

type Phase = "ready" | "running" | "confirming" | "results";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ExamPlayer({
  quiz,
  timeLimitSeconds,
}: {
  quiz: Quiz;
  timeLimitSeconds: number;
}) {
  const t = useTranslations("examSimulator");
  const [phase, setPhase] = useState<Phase>("ready");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, ExamAnswer>>({});
  const [timeLeft, setTimeLeft] = useState(timeLimitSeconds);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{
    score: number | null;
    passed: boolean | null;
    correctCount: number;
    totalMC: number;
    timeTaken: number;
  } | null>(null);

  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Timer ──────────────────────────────────────────────────────────────────

  const submitExam = useCallback(
    async (forced = false) => {
      if (saving) return;
      setSaving(true);
      setPhase("results");

      if (timerRef.current) clearInterval(timerRef.current);

      const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);

      // Calculate score locally before saving
      const mcQuestions = quiz.questions.filter(
        (q) => q.questionType === "MULTIPLE_CHOICE" || q.questionType === "TRUE_FALSE"
      );
      let correctCount = 0;
      const answersPayload = quiz.questions.map((q) => {
        const a = answers[q.id];
        const isMC =
          q.questionType === "MULTIPLE_CHOICE" || q.questionType === "TRUE_FALSE";
        let isCorrect: boolean | null = null;
        if (isMC && a?.selectedOptionId) {
          const opt = q.options.find((o) => o.id === a.selectedOptionId);
          isCorrect = opt?.isCorrect ?? false;
          if (isCorrect) correctCount++;
        }
        return {
          questionId: q.id,
          selectedOptionIds: a?.selectedOptionId ? [a.selectedOptionId] : [],
          openResponse: a?.openResponse || null,
          isCorrect,
        };
      });

      const totalMC = mcQuestions.length;
      const score = totalMC > 0 ? Math.round((correctCount / totalMC) * 100) : null;
      const passed = score !== null ? score >= quiz.passingScore : null;

      setResult({ score, passed, correctCount, totalMC, timeTaken });

      // Save attempt
      try {
        await fetch(`/api/quizzes/${quiz.id}/attempts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: answersPayload }),
        });
      } catch {
        // non-blocking
      }
      setSaving(false);
    },
    [answers, quiz, saving]
  );

  useEffect(() => {
    if (phase !== "running") return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          submitExam(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, submitExam]);

  // ── Answer handlers ────────────────────────────────────────────────────────

  function selectOption(questionId: string, optionId: string) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        selectedOptionId: optionId,
        openResponse: prev[questionId]?.openResponse ?? "",
      },
    }));
  }

  function setOpenResponse(questionId: string, text: string) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        selectedOptionId: prev[questionId]?.selectedOptionId ?? null,
        openResponse: text,
      },
    }));
  }

  // ── Derived state ──────────────────────────────────────────────────────────

  const answeredCount = quiz.questions.filter((q) => {
    const a = answers[q.id];
    const isMC =
      q.questionType === "MULTIPLE_CHOICE" || q.questionType === "TRUE_FALSE";
    return isMC ? !!a?.selectedOptionId : !!a?.openResponse?.trim();
  }).length;

  const unansweredCount = quiz.questions.length - answeredCount;
  const isAlmostUp = timeLeft <= 120 && timeLeft > 0;
  const question = quiz.questions[currentIdx];

  // ── Type label helper ──────────────────────────────────────────────────────

  function quizTypeLabel(type: string): string {
    const map: Record<string, string> = {
      MULTIPLE_CHOICE: t("player.typeMultipleChoice"),
      OPEN_ANSWER: t("player.typeOpenAnswer"),
      MIXED: t("player.typeMixed"),
      EXAM_SIMULATION: t("player.typeExam"),
    };
    return map[type] ?? type;
  }

  // ── Phase: ready ───────────────────────────────────────────────────────────

  if (phase === "ready") {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <Card variant="glass" className="rounded-3xl">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">{quiz.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoRow label={t("player.questions")} value={String(quiz.questions.length)} />
              <InfoRow label={t("player.time")} value={formatTime(timeLimitSeconds)} />
              <InfoRow label={t("player.passing")} value={`${quiz.passingScore}%`} />
              <InfoRow label={t("player.type")} value={quizTypeLabel(quiz.quizType)} />
            </div>

            <div className="glass-sm rounded-xl border-l-2 border-l-amber-400 px-4 py-3 text-sm space-y-1">
              <p className="font-medium">{t("player.conditionsTitle")}</p>
              <ul className="list-disc list-inside text-xs space-y-0.5">
                <li>{t("player.condition1")}</li>
                <li>{t("player.condition2")}</li>
                <li>{t("player.condition3")}</li>
              </ul>
            </div>

            <Button
              className="w-full"
              onClick={() => {
                startTimeRef.current = Date.now();
                setPhase("running");
              }}
            >
              {t("player.start")}
            </Button>
            <Link href="/exam-simulator">
              <Button variant="outline" className="w-full">
                {t("player.back")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Phase: results ─────────────────────────────────────────────────────────

  if (phase === "results") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Score card */}
        <Card variant="glass" className="rounded-3xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">{t("player.resultsTitle")}</CardTitle>
            <p className="text-muted-foreground">{quiz.title}</p>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {result?.score !== null && result?.score !== undefined ? (
              <>
                <div
                  className={`text-7xl font-bold ${
                    result.passed ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {result.score}%
                </div>
                <div className={`text-lg font-semibold ${result.passed ? "text-green-600" : "text-red-500"}`}>
                  {result.passed ? t("player.passed") : t("player.failed")}
                </div>
                <div className="flex justify-center gap-6 text-sm text-muted-foreground">
                  <span>✅ {result.correctCount} {t("player.correct")}</span>
                  <span>❌ {result.totalMC - result.correctCount} {t("player.incorrect")}</span>
                  <span>⏱️ {formatTime(result.timeTaken)}</span>
                </div>
              </>
            ) : (
              <>
                <div className="text-5xl">✅</div>
                <p className="text-lg font-medium">{t("player.submitted")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("player.noAutoScore")}
                </p>
              </>
            )}

            <div className="flex gap-3 justify-center pt-2">
              <Link href="/exam-simulator">
                <Button variant="outline">{t("player.newExam")}</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Per-question review */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">{t("player.reviewTitle")}</h2>
          {quiz.questions.map((q, idx) => {
            const a = answers[q.id];
            const isMC =
              q.questionType === "MULTIPLE_CHOICE" ||
              q.questionType === "TRUE_FALSE";
            const selectedOpt = isMC
              ? q.options.find((o) => o.id === a?.selectedOptionId)
              : null;
            const isCorrect = selectedOpt?.isCorrect ?? null;

            return (
              <Card
                key={q.id}
                variant="glass-sm"
                className={
                  isMC && isCorrect !== null
                    ? isCorrect
                      ? "ring-1 ring-green-400/60"
                      : "ring-1 ring-red-400/60"
                    : ""
                }
              >
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
                      {idx + 1}.
                    </span>
                    <p className="text-sm font-medium">{q.questionText}</p>
                    {isMC && (
                      <span className="ml-auto shrink-0">
                        {isCorrect === true ? "✅" : isCorrect === false ? "❌" : "—"}
                      </span>
                    )}
                  </div>

                  {isMC && (
                    <div className="space-y-1 pl-4">
                      {q.options.map((opt) => {
                        const selected = a?.selectedOptionId === opt.id;
                        let cls = "text-xs px-3 py-1.5 rounded-md ";
                        if (opt.isCorrect) {
                          cls += "bg-green-100 text-green-800";
                        } else if (selected && !opt.isCorrect) {
                          cls += "bg-red-100 text-red-800";
                        } else {
                          cls += "text-muted-foreground";
                        }
                        return (
                          <div key={opt.id} className={cls}>
                            {opt.isCorrect ? "✓ " : selected ? "✗ " : "  "}
                            {opt.text}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {!isMC && a?.openResponse && (
                    <div className="pl-4">
                      <p className="text-xs text-muted-foreground italic">
                        {t("player.yourAnswer")}{a.openResponse}
                      </p>
                    </div>
                  )}

                  {q.explanation && (
                    <div className="glass-sm rounded-xl border-l-2 border-l-primary/50 px-3 py-2 text-xs">
                      <span className="font-medium text-primary">{t("player.explanation")}</span>
                      <span className="text-foreground/80">{q.explanation}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Phase: running or confirming ───────────────────────────────────────────

  const isMC =
    question?.questionType === "MULTIPLE_CHOICE" ||
    question?.questionType === "TRUE_FALSE";
  const currentAnswer = answers[question?.id] ?? {
    selectedOptionId: null,
    openResponse: "",
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 sticky top-0 z-10 glass border-b border-white/20 py-2 px-3 rounded-xl -mx-3">
        <h1 className="text-base font-semibold line-clamp-1">{quiz.title}</h1>
        <div
          className={`font-mono text-lg font-bold tabular-nums px-3 py-1 rounded-lg ${
            isAlmostUp
              ? "glass-sm border border-red-400/50 text-red-600 dark:text-red-400 animate-pulse"
              : "glass-sm text-foreground"
          }`}
        >
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* ── Question palette ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5">
        {quiz.questions.map((q, idx) => {
          const a = answers[q.id];
          const answered = isMCQuestion(q)
            ? !!a?.selectedOptionId
            : !!a?.openResponse?.trim();
          const isCurrent = idx === currentIdx;
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => setCurrentIdx(idx)}
              className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                isCurrent
                  ? "btn-gradient text-white"
                  : answered
                    ? "bg-green-100/50 dark:bg-green-900/20 text-green-800 dark:text-green-400 border border-green-400/50"
                    : "glass-sm text-muted-foreground hover:brightness-95 dark:hover:brightness-110"
              }`}
            >
              {idx + 1}
            </button>
          );
        })}
        <div className="ml-auto text-xs text-muted-foreground self-center">
          {t("player.answered", { answered: answeredCount, total: quiz.questions.length })}
        </div>
      </div>

      {/* ── Question card ─────────────────────────────────────────────────── */}
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
            <span className="ml-auto text-xs text-muted-foreground">
              {currentIdx + 1} / {quiz.questions.length}
            </span>
          </div>
          <CardTitle className="text-base font-medium leading-relaxed">
            {question.questionText}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isMC ? (
            <div className="space-y-2">
              {question.options.map((opt) => {
                const selected = currentAnswer.selectedOptionId === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`w-full text-left px-4 py-3 glass-sm rounded-xl text-sm transition-colors ${
                      selected
                        ? "border border-primary bg-primary/10 text-primary font-medium ring-1 ring-primary/30"
                        : "border border-transparent hover:border-primary/40 hover:brightness-95 dark:hover:brightness-110"
                    }`}
                    onClick={() => selectOption(question.id, opt.id)}
                  >
                    {opt.text}
                  </button>
                );
              })}
            </div>
          ) : (
            <textarea
              className="w-full min-h-[140px] glass-sm rounded-xl border border-white/30 dark:border-white/10 bg-transparent px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder={t("player.typeOpenAnswer")}
              value={currentAnswer.openResponse}
              onChange={(e) => setOpenResponse(question.id, e.target.value)}
            />
          )}
        </CardContent>
      </Card>

      {/* ── Navigation + submit ───────────────────────────────────────────── */}
      {phase === "confirming" ? (
        <Card variant="glass" className="border-l-2 border-l-amber-400">
          <CardContent className="py-4 space-y-3">
            <p className="text-sm font-medium">
              {t("player.confirmTitle")}
            </p>
            {unansweredCount > 0 && (
              <p className="text-sm text-amber-700">
                {unansweredCount === 1
                  ? t("player.unansweredWarning", { count: unansweredCount })
                  : t("player.unansweredWarningPlural", { count: unansweredCount })}
              </p>
            )}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setPhase("running")}
              >
                {t("player.continueExam")}
              </Button>
              <Button
                className="flex-1 bg-amber-500 hover:bg-amber-600"
                onClick={() => submitExam()}
                disabled={saving}
              >
                {saving ? t("player.saving") : t("player.confirmDelivery")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            disabled={currentIdx === 0}
          >
            {t("player.previous")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCurrentIdx((i) => Math.min(quiz.questions.length - 1, i + 1))
            }
            disabled={currentIdx === quiz.questions.length - 1}
          >
            {t("player.next")}
          </Button>
          <Button
            className="ml-auto"
            onClick={() => setPhase("confirming")}
          >
            {t("player.submitExam")}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isMCQuestion(q: Question): boolean {
  return q.questionType === "MULTIPLE_CHOICE" || q.questionType === "TRUE_FALSE";
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="glass-sm flex items-center gap-2 rounded-xl p-3">
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  );
}
