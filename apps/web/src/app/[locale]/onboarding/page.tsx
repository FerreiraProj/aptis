"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Stethoscope, Heart, Scale, Wrench, FlaskConical, Smile, Brain, BookOpen,
  Sprout, TrendingUp, Flame,
  Zap, Image, Lightbulb, Microscope, Users, Globe, Dumbbell,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ExplanationStyle = "CONCISE" | "DETAILED" | "VISUAL" | "ANALOGICAL";

interface FormData {
  studyNiche: string;
  currentLevel: string;
  preferredExplanationStyle: ExplanationStyle;
  examDate: string;
  hoursPerDay: string;
  gradeGoal: string;
}

// ─── Static icon maps (no translation needed) ─────────────────────────────────

const NICHE_VALUES = [
  "medicine", "nursing", "law", "engineering", "pharmacy",
  "dentistry", "psychology", "biology", "sociology", "geography", "sports", "other",
] as const;

const NICHE_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  medicine: Stethoscope, nursing: Heart, law: Scale, engineering: Wrench,
  pharmacy: FlaskConical, dentistry: Smile, psychology: Brain, biology: Microscope,
  sociology: Users, geography: Globe, sports: Dumbbell, other: BookOpen,
};

const LEVEL_VALUES = ["beginner", "intermediate", "advanced"] as const;
const LEVEL_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  beginner: Sprout, intermediate: TrendingUp, advanced: Flame,
};

const STYLE_VALUES = ["CONCISE", "DETAILED", "VISUAL", "ANALOGICAL"] as const;
const STYLE_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  CONCISE: Zap, DETAILED: BookOpen, VISUAL: Image, ANALOGICAL: Lightbulb,
};
const STYLE_KEYS: Record<string, string> = {
  CONCISE: "concise", DETAILED: "detailed", VISUAL: "visual", ANALOGICAL: "analogical",
};

const TOTAL_STEPS = 4;

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const t = useTranslations("onboarding");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormData>({
    studyNiche: "",
    currentLevel: "",
    preferredExplanationStyle: "CONCISE",
    examDate: "",
    hoursPerDay: "2",
    gradeGoal: "",
  });

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function canProceed(): boolean {
    if (step === 1) return form.studyNiche !== "";
    if (step === 2) return form.currentLevel !== "";
    if (step === 3) return true;
    return true;
  }

  async function handleFinish() {
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        studyNiche: form.studyNiche,
        currentLevel: form.currentLevel,
        preferredExplanationStyle: form.preferredExplanationStyle,
        hoursPerDay: form.hoursPerDay ? parseFloat(form.hoursPerDay) : null,
        gradeGoal: form.gradeGoal || null,
        examDate: form.examDate || null,
      };

      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error();

      router.push("/dashboard");
    } catch {
      toast.error(t("saveError"));
      setLoading(false);
    }
  }

  return (
    <div className="page-bg aurora-bg flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>{t("profileSetup")}</span>
            <span>{t("stepOf", { step, total: TOTAL_STEPS })}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/30 dark:bg-white/10">
            <div
              className="h-full rounded-full btn-gradient transition-all duration-300"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        {step === 1 && (
          <StepNiche
            value={form.studyNiche}
            onChange={(v) => setField("studyNiche", v)}
          />
        )}
        {step === 2 && (
          <StepLevel
            value={form.currentLevel}
            onChange={(v) => setField("currentLevel", v)}
          />
        )}
        {step === 3 && (
          <StepStyle
            value={form.preferredExplanationStyle}
            onChange={(v) => setField("preferredExplanationStyle", v)}
          />
        )}
        {step === 4 && (
          <StepGoals
            examDate={form.examDate}
            hoursPerDay={form.hoursPerDay}
            gradeGoal={form.gradeGoal}
            onChange={(key, val) => setField(key as keyof FormData, val)}
          />
        )}

        {/* Navigation */}
        <div className="mt-6 flex gap-3">
          {step > 1 && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setStep((s) => s - 1)}
              disabled={loading}
            >
              {tCommon("previous")}
            </Button>
          )}
          {step < TOTAL_STEPS ? (
            <Button
              className="flex-1"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
            >
              {t("continue")}
            </Button>
          ) : (
            <Button
              className="flex-1"
              onClick={handleFinish}
              disabled={loading}
            >
              {loading ? t("saving") : t("startStudying")}
            </Button>
          )}
        </div>

        {step === 4 && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {t("settingsNote")}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Step 1: Study niche ──────────────────────────────────────────────────────

function StepNiche({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const t = useTranslations("onboarding");
  return (
    <Card variant="glass" className="shadow-2xl rounded-3xl">
      <CardHeader>
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Stethoscope size={22} className="text-primary" />
        </div>
        <CardTitle>{t("step1Title")}</CardTitle>
        <CardDescription>{t("step1Desc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {NICHE_VALUES.map((niche) => {
            const Icon = NICHE_ICONS[niche];
            return (
              <button
                key={niche}
                type="button"
                onClick={() => onChange(niche)}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left text-sm transition-all hover:bg-accent/60 ${
                  value === niche
                    ? "border-primary bg-primary/10 ring-1 ring-primary/30 font-medium"
                    : "border-border/50"
                }`}
              >
                <Icon size={18} className={value === niche ? "text-primary" : "text-muted-foreground"} />
                {t(`niches.${niche}`)}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Step 2: Level ────────────────────────────────────────────────────────────

function StepLevel({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const t = useTranslations("onboarding");
  return (
    <Card variant="glass" className="shadow-2xl rounded-3xl">
      <CardHeader>
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <TrendingUp size={22} className="text-primary" />
        </div>
        <CardTitle>{t("step2Title")}</CardTitle>
        <CardDescription>{t("step2Desc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {LEVEL_VALUES.map((level) => {
            const Icon = LEVEL_ICONS[level];
            return (
              <button
                key={level}
                type="button"
                onClick={() => onChange(level)}
                className={`w-full rounded-xl border p-4 text-left transition-all hover:bg-accent/60 ${
                  value === level
                    ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                    : "border-border/50"
                }`}
              >
                <div className="flex items-center gap-2 font-medium">
                  <Icon size={16} className={value === level ? "text-primary" : "text-muted-foreground"} />
                  {t(`levels.${level}`)}
                </div>
                <div className="text-sm text-muted-foreground">{t(`levels.${level}Desc`)}</div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Step 3: Explanation style ────────────────────────────────────────────────

function StepStyle({
  value,
  onChange,
}: {
  value: ExplanationStyle;
  onChange: (v: ExplanationStyle) => void;
}) {
  const t = useTranslations("onboarding");
  return (
    <Card variant="glass" className="shadow-2xl rounded-3xl">
      <CardHeader>
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Brain size={22} className="text-primary" />
        </div>
        <CardTitle>{t("step3Title")}</CardTitle>
        <CardDescription>{t("step3Desc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {STYLE_VALUES.map((style) => {
            const Icon = STYLE_ICONS[style];
            const key = STYLE_KEYS[style];
            return (
              <button
                key={style}
                type="button"
                onClick={() => onChange(style)}
                className={`w-full rounded-xl border p-4 text-left transition-all hover:bg-accent/60 ${
                  value === style
                    ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                    : "border-border/50"
                }`}
              >
                <div className="flex items-center gap-2 font-medium">
                  <Icon size={16} className={value === style ? "text-primary" : "text-muted-foreground"} />
                  {t(`styles.${key}`)}
                </div>
                <div className="mt-0.5 text-sm text-muted-foreground">{t(`styles.${key}Desc`)}</div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Step 4: Goals ────────────────────────────────────────────────────────────

function StepGoals({
  examDate,
  hoursPerDay,
  gradeGoal,
  onChange,
}: {
  examDate: string;
  hoursPerDay: string;
  gradeGoal: string;
  onChange: (key: string, val: string) => void;
}) {
  const t = useTranslations("onboarding");
  return (
    <Card variant="glass" className="shadow-2xl rounded-3xl">
      <CardHeader>
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Flame size={22} className="text-primary" />
        </div>
        <CardTitle>{t("step4Title")}</CardTitle>
        <CardDescription>{t("step4Desc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="examDate">{t("examDateLabel")}</Label>
          <Input
            id="examDate"
            type="date"
            value={examDate}
            onChange={(e) => onChange("examDate", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hoursPerDay">{t("hoursLabel")}</Label>
          <Input
            id="hoursPerDay"
            type="number"
            min="0.5"
            max="16"
            step="0.5"
            value={hoursPerDay}
            onChange={(e) => onChange("hoursPerDay", e.target.value)}
            placeholder="2"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gradeGoal">{t("gradeLabel")}</Label>
          <Input
            id="gradeGoal"
            type="text"
            value={gradeGoal}
            onChange={(e) => onChange("gradeGoal", e.target.value)}
            placeholder={t("gradePlaceholder")}
            maxLength={20}
          />
        </div>
      </CardContent>
    </Card>
  );
}
