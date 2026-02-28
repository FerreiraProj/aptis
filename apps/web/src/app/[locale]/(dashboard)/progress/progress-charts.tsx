"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { BarChart2 } from "lucide-react";

// ─── Dark mode hook ────────────────────────────────────────────────────────────

function useIsDark() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const check = () =>
      setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

// ─── Types ───────────────────────────────────────────────────────────────────

type Stats = {
  totalReviews: number;
  recentReviews: number;
  retentionRate: number;
  streak: number;
  totalFlashcards: number;
  dueToday: number;
  difficultyDistribution: { EASY: number; MEDIUM: number; HARD: number };
  quizAvgScore: number | null;
  quizPassRate: number | null;
  totalDocs: number;
  totalQuizzes: number;
};

type ChartDay = {
  date: string;
  label: string;
  reviews: number;
  retention: number;
};

type RecentQuiz = {
  id: string;
  title: string;
  score: number | null;
  passed: boolean | null;
  completedAt: string | null;
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function ProgressCharts({
  stats,
  chartDays,
  recentQuizzes,
}: {
  stats: Stats;
  chartDays: ChartDay[];
  recentQuizzes: RecentQuiz[];
}) {
  const t = useTranslations("progress");
  const isDark = useIsDark();
  const hasActivity = stats.totalReviews > 0 || stats.totalQuizzes > 0;

  // Chart colors that adapt to theme
  const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const axisColor = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)";
  const tooltipStyle = {
    background: isDark ? "rgba(15,23,42,0.92)" : "rgba(255,255,255,0.95)",
    backdropFilter: "blur(12px)",
    border: isDark
      ? "1px solid rgba(255,255,255,0.15)"
      : "1px solid rgba(0,0,0,0.08)",
    borderRadius: "10px",
    fontSize: "12px",
    color: isDark ? "#e2e8f0" : "#1e293b",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {!hasActivity && (
        <Card variant="glass" className="border-dashed border-primary/30">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <BarChart2 size={28} className="text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{t("noData")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("noDataDesc")}
              </p>
            </div>
            <Link
              href="/flashcards"
              className="text-sm text-primary hover:underline"
            >
              {t("goToFlashcards")}
            </Link>
          </CardContent>
        </Card>
      )}

      {/* ── Overview Stats ─────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("currentStreak")}
          value={stats.streak > 0 ? `${stats.streak} ${t("days")}` : "—"}
          sub={stats.streak > 0 ? t("consecutiveDays") : t("startToday")}
          highlight={stats.streak >= 7}
          icon="🔥"
        />
        <StatCard
          title={t("retention30d")}
          value={stats.recentReviews > 0 ? `${stats.retentionRate}%` : "—"}
          sub={t("reviewsCount", { count: stats.recentReviews })}
          highlight={stats.retentionRate >= 80}
          icon="🧠"
        />
        <StatCard
          title={t("flashcardsForToday")}
          value={String(stats.dueToday)}
          sub={t("ofTotal", { total: stats.totalFlashcards })}
          highlight={stats.dueToday === 0 && stats.totalFlashcards > 0}
          icon="🃏"
        />
        <StatCard
          title={t("avgQuizScore")}
          value={stats.quizAvgScore !== null ? `${stats.quizAvgScore}%` : "—"}
          sub={
            stats.quizPassRate !== null
              ? t("passRate", { rate: stats.quizPassRate })
              : t("noQuizzes")
          }
          icon="🎯"
        />
      </div>

      {/* ── Inventory row ──────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MiniStat label={t("documents")} value={stats.totalDocs} icon="📄" />
        <MiniStat label="Flashcards" value={stats.totalFlashcards} icon="🃏" />
        <MiniStat label={t("generatedQuizzes")} value={stats.totalQuizzes} icon="🎯" />
      </div>

      {/* ── Activity Bar Chart ──────────────────────────────────── */}
      {stats.recentReviews > 0 && (
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-base">{t("dailyReviews")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={chartDays}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: axisColor }}
                  interval={4}
                  stroke={gridColor}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: axisColor }}
                  stroke={gridColor}
                />
                <Tooltip
                  formatter={(v) => [`${v} ${t("reviewsCount", { count: Number(v) }).split(" ")[1] ?? ""}`, ""]}
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="reviews" fill="#38bdf8" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Retention Line Chart ────────────────────────────────── */}
      {stats.recentReviews > 0 && (
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-base">{t("dailyRetention")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart
                data={chartDays.filter((d) => d.reviews > 0)}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: axisColor }}
                  stroke={gridColor}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: axisColor }}
                  stroke={gridColor}
                />
                <Tooltip
                  formatter={(v) => [`${v}%`, t("retention")]}
                  contentStyle={tooltipStyle}
                />
                <Line
                  type="monotone"
                  dataKey="retention"
                  stroke="#4ade80"
                  strokeWidth={2.5}
                  dot={{ fill: "#4ade80", r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "#4ade80" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Flashcard difficulty ────────────────────────────────── */}
      {stats.totalFlashcards > 0 && (
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-base">{t("byDifficulty")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <DiffBar
                label={t("easy")}
                count={stats.difficultyDistribution.EASY}
                total={stats.totalFlashcards}
                color="bg-green-500"
              />
              <DiffBar
                label={t("medium")}
                count={stats.difficultyDistribution.MEDIUM}
                total={stats.totalFlashcards}
                color="bg-yellow-500"
              />
              <DiffBar
                label={t("hard")}
                count={stats.difficultyDistribution.HARD}
                total={stats.totalFlashcards}
                color="bg-red-500"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Recent Quiz Attempts ────────────────────────────────── */}
      {recentQuizzes.length > 0 && (
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-base">{t("recentQuizAttempts")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {recentQuizzes.map((q) => (
                <div key={q.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{q.title}</p>
                    {q.completedAt && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(q.completedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {q.score !== null && (
                      <span
                        className={`text-sm font-semibold ${
                          q.passed ? "text-green-600" : "text-red-500"
                        }`}
                      >
                        {Math.round(q.score)}%
                      </span>
                    )}
                    {q.passed !== null && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          q.passed
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {q.passed ? t("quizPassed") : t("quizFailed")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  sub,
  icon,
  highlight,
}: {
  title: string;
  value: string;
  sub: string;
  icon: string;
  highlight?: boolean;
}) {
  return (
    <Card
      variant="glass"
      className={highlight ? "ring-2 ring-primary/40 shadow-lg shadow-primary/10" : ""}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
          <span>{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}

function MiniStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="glass-sm flex items-center gap-3 rounded-xl p-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <div className="text-xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function DiffBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-12 text-xs text-muted-foreground">{label}</span>
      <div className="flex-1 h-2 bg-white/30 dark:bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-16 text-xs text-right text-muted-foreground">
        {count} ({pct}%)
      </span>
    </div>
  );
}
