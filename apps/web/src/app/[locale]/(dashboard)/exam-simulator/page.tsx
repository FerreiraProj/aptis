import { createClient } from "@/lib/supabase/server";
import { prisma } from "@aptis/database";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Timer, VolumeX, BarChart2, Trophy } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getTranslations } from "next-intl/server";
import { getUserPlan } from "@/lib/rate-limit";
import { hasFeature } from "@/lib/plans";
import { PlanGate } from "@/components/plan-gate";

export const metadata = { title: "Exam Simulator" };

export default async function ExamSimulatorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const plan = await getUserPlan(user.id);
  if (!hasFeature(plan, "examSimulator")) {
    return <PlanGate feature="examSimulator" />;
  }

  const t = await getTranslations("examSimulator");

  const quizzes = await prisma.quiz.findMany({
    where: { document: { userId: user.id } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      quizType: true,
      timeLimit: true,
      passingScore: true,
      document: { select: { title: true } },
      _count: { select: { questions: true, attempts: true } },
      attempts: {
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { score: true, passed: true },
      },
    },
  });

  // Only show quizzes that have questions and are MC or MIXED (can be scored)
  const eligible = quizzes.filter((q) => q._count.questions > 0);

  const infoCards = [
    { icon: <Timer size={20} className="text-primary" />, title: t("timerTitle"), desc: t("timerDesc") },
    { icon: <VolumeX size={20} className="text-primary" />, title: t("noFeedbackTitle"), desc: t("noFeedbackDesc") },
    { icon: <BarChart2 size={20} className="text-primary" />, title: t("reportTitle"), desc: t("reportDesc") },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* How it works */}
      <div className="grid gap-3 sm:grid-cols-3">
        {infoCards.map((item) => (
          <div key={item.title} className="glass-sm flex gap-3 rounded-xl p-3 text-sm">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              {item.icon}
            </div>
            <div>
              <p className="font-medium">{item.title}</p>
              <p className="text-muted-foreground text-xs">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {eligible.length === 0 ? (
        <Card variant="glass" className="border-dashed border-primary/30">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Trophy size={28} className="text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{t("noQuizzes")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("noQuizzesDesc")}
              </p>
            </div>
            <Link href="/upload">
              <Button>{t("uploadDocument")}</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {eligible.map((quiz) => {
            const lastAttempt = quiz.attempts[0] ?? null;
            const timeLimitMin = quiz.timeLimit
              ? Math.round(quiz.timeLimit / 60)
              : Math.max(5, Math.ceil(quiz._count.questions * 1.5));
            return (
              <Card key={quiz.id} variant="glass" className="hover:scale-[1.01] transition-transform">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base line-clamp-2">
                      {quiz.title}
                    </CardTitle>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {quiz._count.questions} pergs.
                    </Badge>
                  </div>
                  {quiz.document && (
                    <CardDescription className="truncate">
                      {quiz.document.title}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>⏱️ {timeLimitMin} min</span>
                    <span>🎯 {t("passingScore", { score: quiz.passingScore })}</span>
                    {quiz._count.attempts > 0 && (
                      <span>{t("attempts", { count: quiz._count.attempts })}</span>
                    )}
                  </div>
                  {lastAttempt && lastAttempt.score !== null && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">{t("best")}</span>
                      <span
                        className={
                          lastAttempt.passed
                            ? "text-green-600 font-medium"
                            : "text-red-500 font-medium"
                        }
                      >
                        {Math.round(lastAttempt.score)}%
                        {lastAttempt.passed ? " ✓" : " ✗"}
                      </span>
                    </div>
                  )}
                  <Link href={`/exam-simulator/${quiz.id}`}>
                    <Button size="sm" className="w-full">
                      {t("startSimulation")}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
