import { createClient } from "@/lib/supabase/server";
import { prisma } from "@aptis/database";
import { redirect } from "next/navigation";
import { ProgressCharts } from "./progress-charts";

export const metadata = { title: "Progresso" };

export default async function ProgressPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const userId = user.id;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // ── Parallel data fetching ───────────────────────────────────────────────
  const [
    totalReviews,
    recentReviews,
    recentCorrect,
    dailyActivity,
    totalFlashcards,
    dueToday,
    difficultyGroups,
    quizAttempts,
    totalDocs,
    totalQuizzes,
  ] = await Promise.all([
    // All-time review count
    prisma.progressRecord.count({ where: { userId } }),

    // Reviews in last 30 days
    prisma.progressRecord.count({
      where: { userId, reviewedAt: { gte: thirtyDaysAgo } },
    }),

    // Correct reviews in last 30 days (grade >= 3 = GOOD or EASY)
    prisma.progressRecord.count({
      where: { userId, grade: { gte: 3 }, reviewedAt: { gte: thirtyDaysAgo } },
    }),

    // Daily review activity for last 30 days (raw SQL for date grouping)
    prisma.$queryRaw<
      Array<{ date: string; count: bigint; correct: bigint }>
    >`
      SELECT
        TO_CHAR(reviewed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') as date,
        COUNT(*)::bigint as count,
        COUNT(*) FILTER (WHERE grade >= 3)::bigint as correct
      FROM progress_records
      WHERE user_id = ${userId}::uuid
        AND reviewed_at >= ${thirtyDaysAgo}
      GROUP BY date
      ORDER BY date ASC
    `,

    // Flashcard totals
    prisma.flashcard.count({ where: { userId } }),
    prisma.flashcard.count({ where: { userId, smDueDate: { lte: now } } }),

    // By difficulty
    prisma.flashcard.groupBy({
      by: ["difficulty"],
      where: { userId },
      _count: true,
    }),

    // Last 15 quiz attempts
    prisma.quizAttempt.findMany({
      where: { userId, completedAt: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true,
        score: true,
        passed: true,
        completedAt: true,
        quiz: { select: { title: true, passingScore: true } },
      },
    }),

    // Total documents
    prisma.document.count({ where: { userId, status: "READY" } }),

    // Total quizzes
    prisma.quiz.count({ where: { document: { userId } } }),
  ]);

  // ── Streak calculation ────────────────────────────────────────────────────
  const activityDates = new Set(
    (dailyActivity as Array<{ date: string; count: bigint; correct: bigint }>).map((r) => r.date)
  );

  let streak = 0;
  const todayStr = now.toISOString().slice(0, 10);
  const yesterdayStr = new Date(now.getTime() - 86400000)
    .toISOString()
    .slice(0, 10);

  // Streak starts only if there was activity today or yesterday
  if (activityDates.has(todayStr) || activityDates.has(yesterdayStr)) {
    let cursor = activityDates.has(todayStr) ? now : new Date(now.getTime() - 86400000);
    while (true) {
      const dateStr = cursor.toISOString().slice(0, 10);
      if (!activityDates.has(dateStr)) break;
      streak++;
      cursor = new Date(cursor.getTime() - 86400000);
    }
  }

  // ── Prepare serializable chart data ──────────────────────────────────────
  // Fill in missing days with zeros
  const dailyMap = new Map(
    (dailyActivity as Array<{ date: string; count: bigint; correct: bigint }>).map((r) => [
      r.date,
      { count: Number(r.count), correct: Number(r.correct) },
    ])
  );

  const chartDays: Array<{
    date: string;
    label: string;
    reviews: number;
    retention: number;
  }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const dateStr = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" });
    const day = dailyMap.get(dateStr);
    chartDays.push({
      date: dateStr,
      label,
      reviews: day?.count ?? 0,
      retention: day && day.count > 0 ? Math.round((day.correct / day.count) * 100) : 0,
    });
  }

  const retentionRate =
    recentReviews > 0 ? Math.round((recentCorrect / recentReviews) * 100) : 0;

  const quizAvgScore =
    quizAttempts.length > 0
      ? Math.round(
          quizAttempts.reduce((s, a) => s + (a.score ?? 0), 0) /
            quizAttempts.length
        )
      : null;

  const diffMap = Object.fromEntries(
    difficultyGroups.map((g) => [g.difficulty, g._count])
  );

  return (
    <ProgressCharts
      stats={{
        totalReviews,
        recentReviews,
        retentionRate,
        streak,
        totalFlashcards,
        dueToday,
        difficultyDistribution: {
          EASY: diffMap.EASY ?? 0,
          MEDIUM: diffMap.MEDIUM ?? 0,
          HARD: diffMap.HARD ?? 0,
        },
        quizAvgScore,
        quizPassRate:
          quizAttempts.length > 0
            ? Math.round(
                (quizAttempts.filter((a) => a.passed).length /
                  quizAttempts.length) *
                  100
              )
            : null,
        totalDocs,
        totalQuizzes,
      }}
      chartDays={chartDays}
      recentQuizzes={quizAttempts.map((a) => ({
        id: a.id,
        title: a.quiz?.title ?? "Quiz",
        score: a.score,
        passed: a.passed,
        completedAt: a.completedAt?.toISOString() ?? null,
      }))}
    />
  );
}
