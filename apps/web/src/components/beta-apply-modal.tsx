"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react";

interface BetaApplyModalProps {
  open: boolean;
  onClose: () => void;
}

type StudyLevel = "SECONDARY" | "UNIVERSITY" | "EXAM_PREP" | "OTHER";
type FeedbackCommitment = "YES" | "YES_DETAILED" | "JUST_TRY";

export function BetaApplyModal({ open, onClose }: BetaApplyModalProps) {
  const t = useTranslations("beta");
  const [email, setEmail] = useState("");
  const [studyLevel, setStudyLevel] = useState<StudyLevel | "">("");
  const [disciplines, setDisciplines] = useState("");
  const [feedback, setFeedback] = useState<FeedbackCommitment | "">("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !studyLevel || !disciplines.trim() || !feedback) return;

    setLoading(true);
    try {
      const res = await fetch("/api/beta/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          studyLevel,
          disciplines: disciplines.trim(),
          feedbackCommitment: feedback,
        }),
      });

      if (res.status === 409) {
        toast.error(t("emailTaken"));
        return;
      }
      if (!res.ok) {
        throw new Error();
      }
      setSubmitted(true);
    } catch {
      toast.error("Erro ao enviar candidatura. Tenta novamente.");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      onClose();
      // Reset after close animation
      setTimeout(() => {
        setSubmitted(false);
        setEmail("");
        setStudyLevel("");
        setDisciplines("");
        setFeedback("");
      }, 300);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="glass-dialog border-0 rounded-3xl max-w-lg p-0 overflow-hidden max-h-[90dvh] flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle className="text-xl">{t("modalTitle")}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {t("modalDesc")}
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <CheckCircle size={32} className="text-primary" />
            </div>
            <h3 className="text-lg font-semibold">{t("successTitle")}</h3>
            <p className="text-sm text-muted-foreground max-w-sm">{t("successDesc")}</p>
            <Button variant="glass" onClick={onClose} className="mt-2">
              Fechar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 pb-6 space-y-5 pt-2">
            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="beta-email">Email</Label>
              <Input
                id="beta-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="o.teu@email.com"
                required
              />
            </div>

            {/* Q1 — Study level */}
            <div className="space-y-2">
              <Label>{t("q1Label")}</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["SECONDARY", "UNIVERSITY", "EXAM_PREP", "OTHER"] as StudyLevel[]).map((level) => {
                  const labels: Record<StudyLevel, string> = {
                    SECONDARY: t("q1Secondary"),
                    UNIVERSITY: t("q1University"),
                    EXAM_PREP: t("q1ExamPrep"),
                    OTHER: t("q1Other"),
                  };
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setStudyLevel(level)}
                      className={`rounded-xl border px-3 py-2.5 text-sm text-left transition-colors ${
                        studyLevel === level
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border/50 glass-sm hover:border-primary/40"
                      }`}
                    >
                      {labels[level]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Q2 — Disciplines */}
            <div className="space-y-1.5">
              <Label htmlFor="beta-disciplines">{t("q2Label")}</Label>
              <Textarea
                id="beta-disciplines"
                value={disciplines}
                onChange={(e) => setDisciplines(e.target.value)}
                placeholder={t("q2Placeholder")}
                rows={3}
                required
                className="resize-none"
              />
            </div>

            {/* Q3 — Feedback commitment */}
            <div className="space-y-2">
              <Label>{t("q3Label")}</Label>
              <div className="space-y-2">
                {(["YES", "YES_DETAILED", "JUST_TRY"] as FeedbackCommitment[]).map((opt) => {
                  const labels: Record<FeedbackCommitment, string> = {
                    YES: t("q3Yes"),
                    YES_DETAILED: t("q3YesDetailed"),
                    JUST_TRY: t("q3JustTry"),
                  };
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setFeedback(opt)}
                      className={`w-full rounded-xl border px-4 py-2.5 text-sm text-left transition-colors ${
                        feedback === opt
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border/50 glass-sm hover:border-primary/40"
                      }`}
                    >
                      {labels[opt]}
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !email || !studyLevel || !disciplines.trim() || !feedback}
            >
              {loading ? t("submitting") : t("submitButton")}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
