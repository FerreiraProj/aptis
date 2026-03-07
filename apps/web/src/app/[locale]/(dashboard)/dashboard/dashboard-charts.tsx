"use client";

import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

// ─── Dark mode hook ───────────────────────────────────────────────────────────

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

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActivityDay = {
  label: string;
  reviews: number;
  questions: number;
};

export type DifficultyItem = {
  name: string;
  value: number;
  color: string;
};

export type AccuracyPoint = {
  n: number;
  accuracy: number;
};

export type QuizResult = {
  title: string;
  score: number;
  passed: boolean;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardCharts({
  activityData,
  difficultyData,
  accuracyTrend,
  quizResults,
}: {
  activityData: ActivityDay[];
  difficultyData: DifficultyItem[];
  accuracyTrend: AccuracyPoint[];
  quizResults: QuizResult[];
}) {
  const isDark = useIsDark();

  const grid = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const axis = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.45)";
  const tooltipStyle: React.CSSProperties = {
    background: isDark ? "rgba(10,18,35,0.96)" : "rgba(255,255,255,0.96)",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"}`,
    borderRadius: "10px",
    fontSize: "12px",
    color: isDark ? "#e2e8f0" : "#1e293b",
    backdropFilter: "blur(12px)",
    boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
  };

  const hasActivity = activityData.some(
    (d) => d.reviews > 0 || d.questions > 0
  );
  const hasDifficulty = difficultyData.some((d) => d.value > 0);
  const hasAccuracy = accuracyTrend.length >= 2;
  const hasQuizzes = quizResults.length > 0;

  if (!hasActivity && !hasDifficulty && !hasAccuracy && !hasQuizzes) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* ── Activity Area Chart ───────────────────────────────────────── */}
      {hasActivity && (
        <Card variant="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Atividade dos últimos 14 dias</CardTitle>
            <CardDescription className="text-xs">
              Flashcards revistos e perguntas de quiz por dia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart
                data={activityData}
                margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gradReviews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradQuestions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: axis }}
                  stroke={grid}
                  interval={1}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: axis }}
                  stroke={grid}
                  allowDecimals={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                />
                <Area
                  type="monotone"
                  dataKey="reviews"
                  name="Flashcards"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  fill="url(#gradReviews)"
                />
                <Area
                  type="monotone"
                  dataKey="questions"
                  name="Quiz"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  fill="url(#gradQuestions)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Difficulty + Accuracy Row ─────────────────────────────────── */}
      {(hasDifficulty || hasAccuracy) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Donut: Flashcard difficulty */}
          {hasDifficulty && (
            <Card variant="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Flashcards por dificuldade
                </CardTitle>
                <CardDescription className="text-xs">
                  Distribuição por nível de dificuldade
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="flex-shrink-0">
                    <ResponsiveContainer width={130} height={130}>
                      <PieChart>
                        <Pie
                          data={difficultyData}
                          cx="50%"
                          cy="50%"
                          innerRadius={38}
                          outerRadius={60}
                          dataKey="value"
                          paddingAngle={3}
                          strokeWidth={0}
                        >
                          {difficultyData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={tooltipStyle}
                          formatter={(v, name) => [v, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-2.5 flex-1">
                    {difficultyData.map((d) => (
                      <div key={d.name} className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                          style={{ background: d.color }}
                        />
                        <span className="text-xs text-muted-foreground flex-1">
                          {d.name}
                        </span>
                        <span className="text-xs font-semibold tabular-nums">
                          {d.value}
                        </span>
                      </div>
                    ))}
                    <div className="mt-1 pt-1.5 border-t border-border/40 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground flex-1">
                        Total
                      </span>
                      <span className="text-xs font-bold tabular-nums">
                        {difficultyData.reduce((s, d) => s + d.value, 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Line: Accuracy trend */}
          {hasAccuracy && (
            <Card variant="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Tendência de precisão</CardTitle>
                <CardDescription className="text-xs">
                  Evolução nas últimas sessões de estudo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={130}>
                  <LineChart
                    data={accuracyTrend}
                    margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                    <XAxis
                      dataKey="n"
                      tick={{ fontSize: 10, fill: axis }}
                      stroke={grid}
                      label={{
                        value: "Sessão",
                        position: "insideBottomRight",
                        offset: -4,
                        style: { fontSize: 9, fill: axis },
                      }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 10, fill: axis }}
                      stroke={grid}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v) => [`${v}%`, "Precisão"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="accuracy"
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
        </div>
      )}

      {/* ── Quiz scores ───────────────────────────────────────────────── */}
      {hasQuizzes && (
        <Card variant="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Resultados de Quiz recentes</CardTitle>
            <CardDescription className="text-xs">
              Score dos últimos quizzes concluídos (verde = aprovado)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                data={quizResults}
                margin={{ top: 4, right: 4, left: -20, bottom: 44 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                <XAxis
                  dataKey="title"
                  tick={{ fontSize: 9, fill: axis }}
                  stroke={grid}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: axis }}
                  stroke={grid}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => [`${v}%`, "Score"]}
                />
                <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={60}>
                  {quizResults.map((r, i) => (
                    <Cell
                      key={i}
                      fill={r.passed ? "#4ade80" : "#f87171"}
                      opacity={0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
