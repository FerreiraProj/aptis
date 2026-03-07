import { createClient } from "@/lib/supabase/server";
import { prisma } from "@aptis/database";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { syncSubscriptionFromStripe } from "@/lib/stripe/sync-subscription";
import { Upload, Zap, Target, MessageCircle, Flame, Brain, BookOpen, Trophy } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DashboardCharts, type ActivityDay, type DifficultyItem, type AccuracyPoint, type QuizResult } from "./dashboard-charts";

export const metadata = { title: "Dashboard" };

// ─── Streak helper ────────────────────────────────────────────────────────────

function calcStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;
  const uniqueDays = [
    ...new Set(
      dates.map((d) => {
        const local = new Date(d);
        return `${local.getFullYear()}-${local.getMonth()}-${local.getDate()}`;
      })
    ),
  ].sort().reverse();

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;

  if (uniqueDays[0] !== todayKey && uniqueDays[0] !== yesterdayKey) return 0;

  let streak = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const [y, m, d] = uniqueDays[i - 1].split("-").map(Number);
    const prev = new Date(y, m, d);
    prev.setDate(prev.getDate() - 1);
    const expectedKey = `${prev.getFullYear()}-${prev.getMonth()}-${prev.getDate()}`;
    if (uniqueDays[i] === expectedKey) streak++;
    else break;
  }
  return streak;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const params = await searchParams;
  if (params.checkout === "success") {
    await syncSubscriptionFromStripe(user.id);
    redirect("/dashboard");
  }

  const t = await getTranslations("dashboard");

  const now = new Date();
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const [
    dbUser,
    dueFlashcardsCount,
    recentDocuments,
    sessions14d,
    allSessionDates,
    flashcardsByDiff,
    totalFlashcardsCount,
    recentQuizAttempts,
    recentSessionsAcc,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      include: { subscription: { select: { plan: true } } },
    }),
    prisma.flashcard.count({
      where: { userId: user.id, smDueDate: { lte: now } },
    }),
    prisma.document.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        title: true,
        status: true,
        sourceType: true,
        createdAt: true,
      },
    }),
    // 14-day activity for area chart
    prisma.studySession.findMany({
      where: { userId: user.id, startedAt: { gte: fourteenDaysAgo } },
      select: {
        cardsReviewed: true,
        questionsAnswered: true,
        correctAnswers: true,
        startedAt: true,
      },
      orderBy: { startedAt: "asc" },
    }),
    // All session dates for streak
    prisma.studySession.findMany({
      where: { userId: user.id },
      select: { startedAt: true },
      orderBy: { startedAt: "desc" },
    }),
    // Flashcard difficulty distribution
    prisma.flashcard.groupBy({
      by: ["difficulty"],
      where: { userId: user.id },
      _count: { id: true },
    }),
    // Total flashcards
    prisma.flashcard.count({ where: { userId: user.id } }),
    // Last 5 completed quiz attempts
    prisma.quizAttempt.findMany({
      where: {
        userId: user.id,
        completedAt: { not: null },
        score: { not: null },
      },
      orderBy: { completedAt: "desc" },
      take: 5,
      select: {
        score: true,
        passed: true,
        quiz: { select: { title: true } },
      },
    }),
    // Last 10 sessions for accuracy trend
    prisma.studySession.findMany({
      where: {
        userId: user.id,
        OR: [
          { cardsReviewed: { gt: 0 } },
          { questionsAnswered: { gt: 0 } },
        ],
      },
      orderBy: { startedAt: "desc" },
      take: 10,
      select: {
        cardsReviewed: true,
        questionsAnswered: true,
        correctAnswers: true,
        startedAt: true,
      },
    }),
  ]);

  // ── Compute 14-day activity ────────────────────────────────────────────────

  const dayMap = new Map<
    string,
    { label: string; reviews: number; questions: number }
  >();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const label = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    dayMap.set(key, { label, reviews: 0, questions: 0 });
  }
  for (const s of sessions14d) {
    const d = new Date(s.startedAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const entry = dayMap.get(key);
    if (entry) {
      entry.reviews += s.cardsReviewed;
      entry.questions += s.questionsAnswered;
    }
  }
  const activityData: ActivityDay[] = Array.from(dayMap.values());

  // ── Difficulty distribution ────────────────────────────────────────────────

  const diffMap: Record<string, number> = { EASY: 0, MEDIUM: 0, HARD: 0 };
  for (const row of flashcardsByDiff) {
    diffMap[row.difficulty] = row._count.id;
  }
  const difficultyData: DifficultyItem[] = [
    { name: "Fácil", value: diffMap.EASY, color: "#4ade80" },
    { name: "Médio", value: diffMap.MEDIUM, color: "#facc15" },
    { name: "Difícil", value: diffMap.HARD, color: "#f87171" },
  ].filter((d) => d.value > 0);

  // ── Accuracy trend ─────────────────────────────────────────────────────────

  const accuracyTrend: AccuracyPoint[] = [...recentSessionsAcc]
    .reverse()
    .map((s, i) => {
      const total = s.cardsReviewed + s.questionsAnswered;
      return {
        n: i + 1,
        accuracy: total > 0 ? Math.round((s.correctAnswers / total) * 100) : 0,
      };
    });

  // ── Quiz results ───────────────────────────────────────────────────────────

  const quizResults: QuizResult[] = [...recentQuizAttempts]
    .reverse()
    .map((a) => ({
      title:
        a.quiz.title.length > 20
          ? a.quiz.title.slice(0, 20) + "…"
          : a.quiz.title,
      score: Math.round(a.score!),
      passed: a.passed ?? false,
    }));

  // ── Streak + retention ─────────────────────────────────────────────────────

  const streak = calcStreak(allSessionDates.map((s) => s.startedAt));

  const sessions30d = sessions14d; // reuse what we have (14d is enough for display)
  const totalAnswered = sessions30d.reduce(
    (s, r) => s + r.questionsAnswered + r.cardsReviewed,
    0
  );
  const totalCorrect = sessions30d.reduce((s, r) => s + r.correctAnswers, 0);
  const retention =
    totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  const planLabel = dbUser?.subscription?.plan || "FREE";

  const statusLabels: Record<string, string> = {
    PENDING: t("statusPending"),
    PROCESSING: t("statusProcessing"),
    READY: t("statusReady"),
    FAILED: t("statusFailed"),
  };

  const sourceTypeLabels: Record<string, string> = {
    PDF: "PDF",
    POWERPOINT: "PowerPoint",
    TEXT: t("sourceText"),
    YOUTUBE: "YouTube",
    SCREENSHOT: t("sourceImage"),
    IMAGE: t("sourceImage"),
  };

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {t("greeting", {
              name: dbUser?.fullName?.split(" ")[0] || "Estudante",
            })}{" "}
            👋
          </h1>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>
        <Badge variant={planLabel === "FREE" ? "outline" : "default"}>
          {planLabel}
        </Badge>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          Icon={Flame}
          iconColor="text-orange-400"
          label="Sequência"
          value={streak > 0 ? `${streak} dias` : "—"}
          sub={streak >= 7 ? "Excelente!" : streak > 0 ? "Continua!" : "Começa hoje"}
          highlight={streak >= 3}
        />
        <KpiCard
          Icon={Brain}
          iconColor="text-sky-400"
          label="Retenção (14d)"
          value={totalAnswered > 0 ? `${retention}%` : "—"}
          sub={`${totalAnswered} respostas`}
          highlight={retention >= 80}
        />
        <KpiCard
          Icon={BookOpen}
          iconColor="text-violet-400"
          label={t("dueToday")}
          value={String(dueFlashcardsCount)}
          sub={`de ${totalFlashcardsCount} flashcards`}
          highlight={dueFlashcardsCount > 0}
          action={
            dueFlashcardsCount > 0
              ? { href: "/flashcards/review", label: t("reviewNow") }
              : undefined
          }
        />
        <KpiCard
          Icon={Trophy}
          iconColor="text-yellow-400"
          label="Quiz médio"
          value={
            quizResults.length > 0
              ? `${Math.round(quizResults.reduce((s, r) => s + r.score, 0) / quizResults.length)}%`
              : "—"
          }
          sub={
            quizResults.length > 0
              ? `${quizResults.length} quizzes`
              : "Sem quizzes ainda"
          }
        />
      </div>

      {/* ── Charts ──────────────────────────────────────────────────── */}
      <DashboardCharts
        activityData={activityData}
        difficultyData={difficultyData}
        accuracyTrend={accuracyTrend}
        quizResults={quizResults}
      />

      {/* ── Quick actions ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickAction
          Icon={Upload}
          title={t("uploadPdf")}
          description={t("uploadPdfDesc")}
          href="/upload"
        />
        <QuickAction
          Icon={Zap}
          title={t("reviewFlashcards")}
          description={t("reviewFlashcardsDesc", { count: dueFlashcardsCount })}
          href="/flashcards/review"
        />
        <QuickAction
          Icon={Target}
          title={t("makeQuiz")}
          description={t("makeQuizDesc")}
          href="/quizzes"
        />
        <QuickAction
          Icon={MessageCircle}
          title={t("askTutor")}
          description={t("askTutorDesc")}
          href="/chat"
        />
      </div>

      {/* ── Recent documents ─────────────────────────────────────────── */}
      {recentDocuments.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">{t("recentDocuments")}</h2>
            <Link
              href="/documents"
              className="text-sm text-primary hover:underline"
            >
              {t("viewAll")}
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {recentDocuments.map((doc) => (
              <Link key={doc.id} href={`/documents/${doc.id}`}>
                <Card
                  variant="glass"
                  className="cursor-pointer hover:scale-[1.01] transition-transform h-full"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">
                          {doc.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {sourceTypeLabels[doc.sourceType] ?? doc.sourceType}
                        </p>
                      </div>
                      <StatusBadge
                        status={doc.status}
                        statusLabels={statusLabels}
                      />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────── */}
      {recentDocuments.length === 0 && (
        <Card variant="glass" className="border-dashed border-primary/30">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Upload size={28} className="text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{t("emptyTitle")}</h3>
              <p className="text-sm text-muted-foreground">{t("emptyDesc")}</p>
            </div>
            <Link href="/upload">
              <Button>{t("uploadFirst")}</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  Icon,
  iconColor,
  label,
  value,
  sub,
  highlight,
  action,
}: {
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  iconColor: string;
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
  action?: { href: string; label: string };
}) {
  return (
    <Card
      variant="glass"
      className={highlight ? "ring-2 ring-primary/40 shadow-lg shadow-primary/10" : ""}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon size={15} className={iconColor} />
          <span className="text-xs font-medium text-muted-foreground truncate">
            {label}
          </span>
        </div>
        <div className="text-2xl font-bold leading-none mb-1">{value}</div>
        <p className="text-xs text-muted-foreground leading-snug">{sub}</p>
        {action && (
          <Link href={action.href}>
            <Button size="sm" className="mt-3 w-full h-7 text-xs">
              {action.label}
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

function QuickAction({
  Icon,
  title,
  description,
  href,
}: {
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card
        variant="glass"
        className="cursor-pointer hover:scale-[1.02] transition-transform h-full"
      >
        <CardContent className="p-4">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Icon size={16} className="text-primary" />
          </div>
          <h3 className="font-semibold text-sm leading-snug">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function StatusBadge({
  status,
  statusLabels,
}: {
  status: string;
  statusLabels: Record<string, string>;
}) {
  const variants: Record<
    string,
    "default" | "secondary" | "destructive" | "outline"
  > = {
    PENDING: "outline",
    PROCESSING: "secondary",
    READY: "default",
    FAILED: "destructive",
  };
  return (
    <Badge variant={variants[status] ?? "outline"}>
      {statusLabels[status] ?? status}
    </Badge>
  );
}
