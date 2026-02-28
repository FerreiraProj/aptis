"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import type { Flashcard } from "@aptis/database";
import type { ReviewGrade } from "@/lib/spaced-repetition/sm2";

interface ReviewSessionProps {
  initialCards: Flashcard[];
  onComplete?: (stats: ReviewStats) => void;
}

interface ReviewStats {
  total: number;
  again: number;
  hard: number;
  good: number;
  easy: number;
  timeMs: number;
}

type ReviewState = "front" | "back" | "complete";

export function ReviewSession({ initialCards, onComplete }: ReviewSessionProps) {
  const t = useTranslations("flashcards");
  const [cards, setCards] = useState(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [state, setState] = useState<ReviewState>("front");
  const [isFlipped, setIsFlipped] = useState(false);
  const [stats, setStats] = useState<ReviewStats>({
    total: initialCards.length,
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
    timeMs: 0,
  });
  const [cardStartTime, setCardStartTime] = useState(Date.now());
  const [sessionStartTime] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex) / cards.length) * 100;

  useEffect(() => {
    setCardStartTime(Date.now());
  }, [currentIndex]);

  const showAnswer = useCallback(() => {
    setIsFlipped(true);
    setState("back");
  }, []);

  const handleGrade = useCallback(
    async (grade: ReviewGrade) => {
      if (!currentCard || submitting) return;
      setSubmitting(true);

      const responseTime = Date.now() - cardStartTime;

      try {
        const res = await fetch("/api/flashcards/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            flashcardId: currentCard.id,
            grade,
            responseTime,
          }),
        });

        if (!res.ok) throw new Error("Failed to submit grade");

        // Update stats
        const newStats = { ...stats };
        newStats[grade.toLowerCase() as keyof Pick<ReviewStats, "again" | "hard" | "good" | "easy">]++;
        newStats.timeMs = Date.now() - sessionStartTime;
        setStats(newStats);

        // Move to next card or complete
        if (currentIndex + 1 >= cards.length) {
          setState("complete");
          onComplete?.(newStats);
        } else {
          setCurrentIndex((i) => i + 1);
          setIsFlipped(false);
          setState("front");
        }
      } catch {
        toast.error(t("review.gradeError"));
      } finally {
        setSubmitting(false);
      }
    },
    [currentCard, currentIndex, cards.length, cardStartTime, sessionStartTime, stats, submitting, onComplete, t]
  );

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (state === "front" && e.code === "Space") {
        e.preventDefault();
        showAnswer();
      } else if (state === "back") {
        if (e.key === "1") handleGrade("AGAIN");
        else if (e.key === "2") handleGrade("HARD");
        else if (e.key === "3") handleGrade("GOOD");
        else if (e.key === "4") handleGrade("EASY");
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [state, showAnswer, handleGrade]);

  if (state === "complete") {
    return <SessionComplete stats={stats} />;
  }

  if (!currentCard) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{currentIndex} {t("review.reviewed").toLowerCase()}</span>
          <span>{cards.length - currentIndex} {t("review.remaining").toLowerCase()}</span>
        </div>
        <Progress value={progress} />
      </div>

      {/* Card */}
      <div
        className="relative cursor-pointer"
        onClick={state === "front" ? showAnswer : undefined}
        style={{ perspective: "1000px" }}
      >
        <div
          className="relative transition-transform duration-500"
          style={{
            transformStyle: "preserve-3d",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Front */}
          <Card variant="glass" className="rounded-3xl min-h-64 select-none" style={{ backfaceVisibility: "hidden" }}>
            <CardContent className="flex flex-col items-center justify-center min-h-64 p-8 text-center">
              {currentCard.topic && (
                <Badge variant="outline" className="mb-4">
                  {currentCard.topic}
                </Badge>
              )}
              <p className="text-xl font-medium">{currentCard.front}</p>
              {currentCard.hint && (
                <p className="mt-4 text-sm text-muted-foreground italic">
                  💡 {currentCard.hint}
                </p>
              )}
              {state === "front" && (
                <p className="mt-6 text-xs text-muted-foreground">
                  {t("review.clickHint")} <kbd className="glass-sm rounded px-1">Space</kbd>
                </p>
              )}
            </CardContent>
          </Card>

          {/* Back */}
          <Card
            variant="glass-sm"
            className="rounded-3xl absolute inset-0 min-h-64 select-none"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <CardContent className="flex flex-col items-center justify-center min-h-64 p-8 text-center">
              {currentCard.topic && (
                <Badge variant="outline" className="mb-4">
                  {currentCard.topic}
                </Badge>
              )}
              <p className="text-xl font-medium text-primary">
                {currentCard.back}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Grade buttons — only shown after flip */}
      {state === "back" && (
        <div className="grid grid-cols-4 gap-2">
          <GradeButton
            grade="AGAIN"
            label={t("review.again")}
            sublabel={t("review.againSublabel")}
            color="bg-red-100 hover:bg-red-200 text-red-800 border-red-200"
            shortcut="1"
            onClick={() => handleGrade("AGAIN")}
            disabled={submitting}
          />
          <GradeButton
            grade="HARD"
            label={t("review.hard")}
            sublabel={t("review.hardSublabel")}
            color="bg-orange-100 hover:bg-orange-200 text-orange-800 border-orange-200"
            shortcut="2"
            onClick={() => handleGrade("HARD")}
            disabled={submitting}
          />
          <GradeButton
            grade="GOOD"
            label={t("review.good")}
            sublabel={t("review.goodSublabel")}
            color="bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-200"
            shortcut="3"
            onClick={() => handleGrade("GOOD")}
            disabled={submitting}
          />
          <GradeButton
            grade="EASY"
            label={t("review.easy")}
            sublabel={t("review.easySublabel")}
            color="bg-green-100 hover:bg-green-200 text-green-800 border-green-200"
            shortcut="4"
            onClick={() => handleGrade("EASY")}
            disabled={submitting}
          />
        </div>
      )}

      {/* Show answer button when front is visible */}
      {state === "front" && (
        <Button className="w-full" onClick={showAnswer}>
          {t("review.showAnswer")}
        </Button>
      )}
    </div>
  );
}

function GradeButton({
  label,
  sublabel,
  color,
  shortcut,
  onClick,
  disabled,
}: {
  grade: ReviewGrade;
  label: string;
  sublabel: string;
  color: string;
  shortcut: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-1 glass-sm rounded-xl p-3 text-sm font-medium transition-colors disabled:opacity-50 ${color}`}
    >
      <span className="font-semibold">{label}</span>
      <span className="text-xs opacity-70">{sublabel}</span>
      <kbd className="mt-1 rounded border bg-background/30 px-1.5 text-xs">
        {shortcut}
      </kbd>
    </button>
  );
}

function SessionComplete({ stats }: { stats: ReviewStats }) {
  const t = useTranslations("flashcards");
  const accuracy =
    stats.total > 0
      ? Math.round(((stats.good + stats.easy) / stats.total) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-md space-y-6 text-center">
      <div className="text-6xl">🎉</div>
      <div>
        <h2 className="text-2xl font-bold">{t("review.complete")}</h2>
        <p className="text-muted-foreground">
          {t("review.reviewedTotal", { total: stats.total })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 text-left">
        <StatItem label={t("review.again")} value={stats.again} color="text-red-600" />
        <StatItem label={t("review.hard")} value={stats.hard} color="text-orange-600" />
        <StatItem label={t("review.good")} value={stats.good} color="text-blue-600" />
        <StatItem label={t("review.easy")} value={stats.easy} color="text-green-600" />
      </div>

      <div className="glass rounded-2xl p-4">
        <p className="text-sm text-muted-foreground">{t("review.accuracy")}</p>
        <p className="text-3xl font-bold">{accuracy}%</p>
      </div>

      <Button
        className="w-full"
        onClick={() => window.location.reload()}
      >
        {t("review.reviewMore")}
      </Button>
    </div>
  );
}

function StatItem({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="glass-sm rounded-xl p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
