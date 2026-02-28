"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type Task = {
  id: string;
  taskType: string;
  title: string;
  description: string | null;
  durationMin: number;
  topic: string | null;
  isCompleted: boolean;
  taskOrder: number;
};

type Day = {
  id: string;
  dayNumber: number;
  date: string; // ISO
  focus?: string | null;
  totalMinutes: number;
  isCompleted: boolean;
  tasks: Task[];
};

type ActivePlan = {
  id: string;
  title: string;
  examDate: string; // ISO
  hoursPerDay: number;
  gradeGoal: string;
  documentIds: string[];
  document: { title: string } | null;
  days: Day[];
};

type UserProfile = {
  examDate: string | null;
  hoursPerDay: number | null;
  gradeGoal: string | null;
  studyNiche: string | null;
};

// ─── Icons & Labels ───────────────────────────────────────────────────────────

const TASK_META: Record<string, { icon: string; color: string }> = {
  READING: { icon: "📖", color: "bg-blue-100 text-blue-800" },
  FLASHCARD_REVIEW: { icon: "🃏", color: "bg-purple-100 text-purple-800" },
  QUIZ: { icon: "🎯", color: "bg-green-100 text-green-800" },
  CHAT: { icon: "💬", color: "bg-orange-100 text-orange-800" },
};

// ─── Main Component ───────────────────────────────────────────────────────────

type Subject = { id: string; name: string; emoji: string; color: string };
type DocWithDiscipline = {
  id: string;
  title: string;
  discipline: Subject | null;
};

export function StudyPlanClient({
  userProfile,
  documents,
  subjects,
  activePlan: initialPlan,
}: {
  userProfile: UserProfile;
  documents: DocWithDiscipline[];
  subjects: Subject[];
  activePlan: ActivePlan | null;
}) {
  const t = useTranslations("studyPlan");
  const tCommon = useTranslations("common");

  const taskTypeLabels: Record<string, string> = {
    READING: t("taskReading"),
    FLASHCARD_REVIEW: t("taskFlashcards"),
    QUIZ: t("taskQuiz"),
    CHAT: t("taskChat"),
  };

  const [plan, setPlan] = useState<ActivePlan | null>(initialPlan);
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>(
    () => {
      const init: Record<string, boolean> = {};
      initialPlan?.days.forEach((d) =>
        d.tasks.forEach((task) => {
          init[task.id] = task.isCompleted;
        })
      );
      return init;
    }
  );
  const [currentWeek, setCurrentWeek] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state — multi-select documents
  const [docSubjectFilter, setDocSubjectFilter] = useState<string | null>(null);
  const [formDocs, setFormDocs] = useState<string[]>([]);
  const [formExamDate, setFormExamDate] = useState(
    userProfile.examDate
      ? new Date(userProfile.examDate).toISOString().split("T")[0]
      : ""
  );
  const [formHours, setFormHours] = useState(
    String(userProfile.hoursPerDay ?? 2)
  );
  const [formGrade, setFormGrade] = useState(userProfile.gradeGoal ?? "");

  function toggleDoc(id: string) {
    setFormDocs((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  }

  const weeks = useMemo(() => {
    if (!plan) return [];
    const chunks: Day[][] = [];
    for (let i = 0; i < plan.days.length; i += 7) {
      chunks.push(plan.days.slice(i, i + 7));
    }
    return chunks;
  }, [plan]);

  const totalWeeks = weeks.length;
  const currentWeekDays = weeks[currentWeek] ?? [];

  const todayStr = new Date().toISOString().split("T")[0];

  const allTasks = plan?.days.flatMap((d) => d.tasks) ?? [];
  const doneCount = allTasks.filter((task) => completedTasks[task.id]).length;
  const totalCount = allTasks.length;
  const completionPct =
    totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const examDaysLeft = plan
    ? Math.ceil(
        (new Date(plan.examDate).getTime() - Date.now()) / 86_400_000
      )
    : null;

  async function handleCreate() {
    if (formDocs.length === 0 || !formExamDate || !formHours) {
      toast.error(t("fieldRequired"));
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/study-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentIds: formDocs,
          examDate: formExamDate,
          hoursPerDay: parseFloat(formHours),
          gradeGoal: formGrade || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? t("generatingError"));
      }

      const { plan: newPlan } = await res.json();
      setPlan(newPlan);
      const initCompleted: Record<string, boolean> = {};
      newPlan.days.forEach((d: Day) =>
        d.tasks.forEach((task: Task) => {
          initCompleted[task.id] = task.isCompleted;
        })
      );
      setCompletedTasks(initCompleted);
      setCurrentWeek(0);
      setShowCreate(false);
      toast.success(t("generatedSuccess"));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("generatingError"));
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete() {
    if (!plan) return;
    setDeleting(true);
    try {
      await fetch(`/api/study-plans/${plan.id}`, { method: "DELETE" });
      setPlan(null);
      setCompletedTasks({});
      setShowDeleteConfirm(false);
      toast.success(t("deleted"));
    } catch {
      toast.error(t("deleteError"));
    } finally {
      setDeleting(false);
    }
  }

  async function toggleTask(taskId: string) {
    const newValue = !completedTasks[taskId];
    setCompletedTasks((prev) => ({ ...prev, [taskId]: newValue }));
    try {
      const res = await fetch(`/api/study-plans/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: newValue }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setCompletedTasks((prev) => ({ ...prev, [taskId]: !newValue }));
      toast.error(t("taskError"));
    }
  }

  // ── No plan — empty state or create form ─────────────────────────────────

  if (!plan || showCreate) {
    return (
      <div className="space-y-6 max-w-xl">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>

        {!showCreate ? (
          <Card variant="glass" className="border-dashed border-primary/30">
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
              </div>
              <div>
                <h3 className="font-semibold">{t("noplan")}</h3>
                <p className="text-sm text-muted-foreground">{t("noplanDesc")}</p>
              </div>
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("noDocuments")}{" "}
                  <a href="/upload" className="text-primary hover:underline">
                    {t("title")}
                  </a>
                </p>
              ) : (
                <Button onClick={() => setShowCreate(true)}>
                  {t("generatePlan")}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card variant="glass">
            <CardHeader>
              <CardTitle>{t("newPlan")}</CardTitle>
              <CardDescription>{t("newPlanDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Multi-document selection */}
              <div className="space-y-2">
                <Label>
                  {t("docsLabel")}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    {t("docsHint")}
                  </span>
                </Label>

                {/* Subject filter pills */}
                {subjects.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDocSubjectFilter(null)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        docSubjectFilter === null
                          ? "bg-primary text-primary-foreground"
                          : "glass-sm text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t("filterAll")}
                    </button>
                    {subjects.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setDocSubjectFilter(docSubjectFilter === s.id ? null : s.id)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                          docSubjectFilter === s.id ? "text-white" : "glass-sm text-muted-foreground hover:text-foreground"
                        }`}
                        style={docSubjectFilter === s.id ? { backgroundColor: s.color } : {}}
                      >
                        {s.emoji} {s.name}
                      </button>
                    ))}
                  </div>
                )}

                <div className="space-y-2 max-h-48 overflow-y-auto glass-sm rounded-xl p-2">
                  {documents
                    .filter((d) => docSubjectFilter === null || d.discipline?.id === docSubjectFilter)
                    .map((d) => {
                      const checked = formDocs.includes(d.id);
                      return (
                        <label
                          key={d.id}
                          className={`flex items-center gap-3 rounded-md px-3 py-2 cursor-pointer transition-colors ${
                            checked
                              ? "bg-primary/5 border border-primary/30"
                              : "hover:bg-accent border border-transparent"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleDoc(d.id)}
                            className="h-4 w-4 rounded accent-primary"
                          />
                          <span className="text-sm truncate flex-1">{d.title}</span>
                          {d.discipline && (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded-full text-white shrink-0"
                              style={{ backgroundColor: d.discipline.color }}
                            >
                              {d.discipline.emoji}
                            </span>
                          )}
                        </label>
                      );
                    })}
                </div>
                {formDocs.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {formDocs.length === 1
                      ? t("docsSelected", { count: formDocs.length })
                      : t("docsSelectedPlural", { count: formDocs.length })}
                  </p>
                ) : (
                  <p className="text-xs text-destructive">
                    {t("selectAtLeastOne")}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="examDate">{t("examDateLabel")}</Label>
                <Input
                  id="examDate"
                  type="date"
                  value={formExamDate}
                  min={new Date(Date.now() + 3 * 86400000)
                    .toISOString()
                    .split("T")[0]}
                  onChange={(e) => setFormExamDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hours">{t("hoursLabel")}</Label>
                <Input
                  id="hours"
                  type="number"
                  min="0.5"
                  max="12"
                  step="0.5"
                  value={formHours}
                  onChange={(e) => setFormHours(e.target.value)}
                  placeholder={t("hoursPlaceholder")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="grade">{t("gradeLabel")}</Label>
                <Input
                  id="grade"
                  value={formGrade}
                  onChange={(e) => setFormGrade(e.target.value)}
                  placeholder={t("gradePlaceholder")}
                />
              </div>

              <div className="flex gap-3 pt-2">
                {!generating && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowCreate(false)}
                  >
                    {tCommon("cancel")}
                  </Button>
                )}
                <Button
                  className="flex-1"
                  onClick={handleCreate}
                  disabled={generating || formDocs.length === 0}
                >
                  {generating ? t("generating") : t("generate")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ── Active plan view ──────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold line-clamp-2">{plan.title}</h1>
          {plan.documentIds.length > 1 ? (
            <p className="text-sm text-muted-foreground">
              {t("multiDocCount", { count: plan.documentIds.length })}
            </p>
          ) : plan.document ? (
            <p className="text-sm text-muted-foreground">{plan.document.title}</p>
          ) : null}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPlan(null);
              setShowCreate(true);
            }}
          >
            {t("regenerate")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setShowDeleteConfirm(true)}
          >
            {t("delete")}
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="glass-sm rounded-xl p-3 text-sm">
          <p className="text-xs text-muted-foreground">{t("daysToExam")}</p>
          <p className="text-2xl font-bold">
            {examDaysLeft !== null && examDaysLeft > 0
              ? examDaysLeft
              : examDaysLeft === 0
                ? t("today")
                : t("passed")}
          </p>
        </div>
        <div className="glass-sm rounded-xl p-3 text-sm">
          <p className="text-xs text-muted-foreground">{t("overallProgress")}</p>
          <p className="text-2xl font-bold">{completionPct}%</p>
          <div className="mt-1 h-1.5 w-full rounded-full bg-white/30 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full btn-gradient transition-all"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>
        <div className="glass-sm rounded-xl p-3 text-sm">
          <p className="text-xs text-muted-foreground">{t("completedTasks")}</p>
          <p className="text-2xl font-bold">
            {doneCount}
            <span className="text-sm text-muted-foreground font-normal">
              /{totalCount}
            </span>
          </p>
        </div>
      </div>

      {/* Week navigation */}
      {totalWeeks > 1 && (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentWeek((w) => Math.max(0, w - 1))}
            disabled={currentWeek === 0}
          >
            {t("previousWeek")}
          </Button>
          <span className="text-sm font-medium">
            {t("weekOf", { current: currentWeek + 1, total: totalWeeks })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCurrentWeek((w) => Math.min(totalWeeks - 1, w + 1))
            }
            disabled={currentWeek === totalWeeks - 1}
          >
            {t("nextWeek")}
          </Button>
        </div>
      )}

      {/* Daily cards */}
      <div className="space-y-4">
        {currentWeekDays.map((day) => {
          const dayDateStr = day.date.split("T")[0];
          const isToday = dayDateStr === todayStr;
          const dayDone = day.tasks.every((task) => completedTasks[task.id]);
          const dayDoneCount = day.tasks.filter(
            (task) => completedTasks[task.id]
          ).length;

          return (
            <Card
              key={day.id}
              variant="glass"
              className={isToday ? "ring-2 ring-primary/40 shadow-lg shadow-primary/10" : ""}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm font-semibold">
                        {t("day", { number: day.dayNumber })} —{" "}
                        {new Date(day.date).toLocaleDateString(undefined, {
                          weekday: "long",
                          day: "numeric",
                          month: "short",
                        })}
                      </CardTitle>
                      {isToday && (
                        <Badge className="text-xs px-1.5 py-0">{t("todayBadge")}</Badge>
                      )}
                      {dayDone && (
                        <Badge
                          variant="secondary"
                          className="text-xs px-1.5 py-0 bg-green-100 text-green-700"
                        >
                          {t("completedBadge")}
                        </Badge>
                      )}
                    </div>
                    {day.focus && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {day.focus}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {dayDoneCount}/{day.tasks.length} •{" "}
                    {day.totalMinutes} min
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {day.tasks.map((task) => {
                  const done = completedTasks[task.id] ?? false;
                  const meta =
                    TASK_META[task.taskType] ?? {
                      icon: "📝",
                      color: "bg-gray-100 text-gray-700",
                    };
                  return (
                    <div
                      key={task.id}
                      className={`flex items-start gap-3 glass-sm rounded-xl p-3 cursor-pointer transition-colors ${
                        done
                          ? "opacity-60"
                          : "hover:brightness-95 dark:hover:brightness-110"
                      }`}
                      onClick={() => toggleTask(task.id)}
                    >
                      {/* Checkbox */}
                      <div
                        className={`mt-0.5 h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center ${
                          done
                            ? "bg-primary border-primary"
                            : "border-muted-foreground"
                        }`}
                      >
                        {done && (
                          <svg
                            className="h-2.5 w-2.5 text-white"
                            fill="none"
                            viewBox="0 0 10 10"
                          >
                            <path
                              d="M1.5 5L3.5 7.5L8.5 2.5"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded font-medium ${meta.color}`}
                          >
                            {meta.icon} {taskTypeLabels[task.taskType] ?? task.taskType}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {task.durationMin} min
                          </span>
                          {task.topic && (
                            <span className="text-xs text-muted-foreground truncate">
                              · {task.topic}
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-sm font-medium mt-0.5 ${
                            done ? "line-through text-muted-foreground" : ""
                          }`}
                        >
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <Card variant="glass" className="border-destructive/50">
          <CardContent className="py-4 space-y-3">
            <p className="text-sm font-medium">
              {t("deleteConfirm")}
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setShowDeleteConfirm(false)}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? t("deleting") : t("deletePlan")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
