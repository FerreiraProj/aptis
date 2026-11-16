"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  CheckSquare,
  CircleDot,
  Layers,
  Loader2,
  Lock,
  PenLine,
  ToggleLeft,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UpgradeDialog } from "@/components/upgrade-dialog";
import {
  GENERATABLE_QUIZ_TYPES,
  QUIZ_DIFFICULTIES,
  type GeneratableQuizType,
  type QuizDifficulty,
} from "@/lib/quiz/question-types";

export type GenerateMode = "quiz" | "flashcards";

export type GenerateOptions =
  | { mode: "quiz"; count: number; quizType: GeneratableQuizType; difficulty: QuizDifficulty }
  | { mode: "flashcards"; count: number };

const QUESTION_PRESETS = [5, 10, 20, 30, 50, 100];
const FLASHCARD_PRESETS = [10, 20, 50, 100, 150, 200];

const TYPE_ICONS: Record<GeneratableQuizType, React.ReactNode> = {
  MULTIPLE_CHOICE: <CircleDot size={18} />,
  MULTIPLE_SELECT: <CheckSquare size={18} />,
  TRUE_FALSE: <ToggleLeft size={18} />,
  OPEN_ANSWER: <PenLine size={18} />,
  MIXED: <Layers size={18} />,
};

interface GenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: GenerateMode;
  /** Max items the user's plan allows for this mode */
  max: number;
  generating: boolean;
  onGenerate: (options: GenerateOptions) => void;
}

export function GenerateDialog({
  open,
  onOpenChange,
  mode,
  max,
  generating,
  onGenerate,
}: GenerateDialogProps) {
  const t = useTranslations("generate");
  const presets = mode === "quiz" ? QUESTION_PRESETS : FLASHCARD_PRESETS;
  const defaultCount = Math.min(mode === "quiz" ? 10 : 20, max);

  const [quizType, setQuizType] = useState<GeneratableQuizType>("MULTIPLE_CHOICE");
  const [difficulty, setDifficulty] = useState<QuizDifficulty>("MIXED");
  const [selectedCount, setCount] = useState(defaultCount);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  // Never exceed the plan limit, even if it changes while the dialog is open
  const count = Math.min(selectedCount, max) || defaultCount;
  const anyLocked = presets.some((p) => p > max);

  function submit() {
    if (mode === "quiz") onGenerate({ mode, count, quizType, difficulty });
    else onGenerate({ mode, count });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !generating && onOpenChange(v)}>
        <DialogContent className="glass border-0 rounded-3xl shadow-2xl max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{mode === "quiz" ? t("quizTitle") : t("flashcardsTitle")}</DialogTitle>
            <DialogDescription>
              {mode === "quiz" ? t("quizDescription") : t("flashcardsDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Question type */}
            {mode === "quiz" && (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium mb-2">{t("typeLabel")}</legend>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {GENERATABLE_QUIZ_TYPES.map((type) => {
                    const selected = quizType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setQuizType(type)}
                        aria-pressed={selected}
                        className={`flex items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors glass-sm ${
                          selected
                            ? "border border-primary bg-primary/10 ring-1 ring-primary/30"
                            : "border border-transparent hover:border-primary/40"
                        } ${type === "MIXED" ? "sm:col-span-2" : ""}`}
                      >
                        <span className={selected ? "text-primary mt-0.5" : "text-muted-foreground mt-0.5"}>
                          {TYPE_ICONS[type]}
                        </span>
                        <span>
                          <span className="block text-sm font-medium">{t(`types.${type}.name`)}</span>
                          <span className="block text-xs text-muted-foreground">
                            {t(`types.${type}.desc`)}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {/* Count */}
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium mb-2">
                {mode === "quiz" ? t("countLabel") : t("flashcardCountLabel")}
              </legend>
              <div className="flex flex-wrap gap-2">
                {presets.map((n) => {
                  const locked = n > max;
                  const selected = count === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      disabled={locked}
                      onClick={() => setCount(n)}
                      aria-pressed={selected}
                      className={`inline-flex min-w-14 items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                        locked
                          ? "glass-sm text-muted-foreground/60 cursor-not-allowed"
                          : selected
                            ? "btn-gradient text-white"
                            : "glass-sm hover:border-primary/40 border border-transparent"
                      }`}
                    >
                      {locked && <Lock size={12} />}
                      {n}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">{t("planLimit", { max })}</p>
              {anyLocked && (
                <p className="text-xs text-muted-foreground">
                  {t("lockedHint")}{" "}
                  <button
                    type="button"
                    className="font-medium text-primary hover:underline"
                    onClick={() => setUpgradeOpen(true)}
                  >
                    {t("seePlans")}
                  </button>
                </p>
              )}
            </fieldset>

            {/* Difficulty */}
            {mode === "quiz" && (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium mb-2">{t("difficultyLabel")}</legend>
                <div className="flex flex-wrap gap-2">
                  {QUIZ_DIFFICULTIES.map((d) => {
                    const selected = difficulty === d;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDifficulty(d)}
                        aria-pressed={selected}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                          selected
                            ? "btn-gradient text-white"
                            : "glass-sm border border-transparent hover:border-primary/40"
                        }`}
                      >
                        {t(`difficulty.${d}`)}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {/* Actions */}
            <div className="space-y-2 pt-1">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={generating}
                  onClick={() => onOpenChange(false)}
                >
                  {t("cancel")}
                </Button>
                <Button className="flex-1" disabled={generating || count < 1} onClick={submit}>
                  {generating ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      {t("generating")}
                    </>
                  ) : (
                    t("generate")
                  )}
                </Button>
              </div>
              {generating && (
                <p className="text-center text-xs text-muted-foreground">{t("generatingHint")}</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <UpgradeDialog open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </>
  );
}
