"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Target } from "lucide-react";

type Subject = { id: string; name: string; emoji: string; color: string };

type Quiz = {
  id: string;
  title: string;
  quizType: string;
  createdAt: Date;
  document: { id: string; title: string; discipline: Subject | null } | null;
  _count: { questions: number; attempts: number };
  attempts: { score: number | null; passed: boolean | null; completedAt: Date | null }[];
};

export function QuizzesClient({
  quizzes,
  subjects,
}: {
  quizzes: Quiz[];
  subjects: Subject[];
}) {
  const t = useTranslations("quizzes");
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);

  const filtered = subjectFilter
    ? quizzes.filter((q) => q.document?.discipline?.id === subjectFilter)
    : quizzes;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("generatedCount", { count: quizzes.length })}</p>
        </div>
        {/* Subject filter */}
        {subjects.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSubjectFilter(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                subjectFilter === null
                  ? "bg-primary text-primary-foreground"
                  : "glass-sm text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("filterAll")}
            </button>
            {subjects.map((s) => (
              <button
                key={s.id}
                onClick={() => setSubjectFilter(subjectFilter === s.id ? null : s.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                  subjectFilter === s.id ? "text-white" : "glass-sm text-muted-foreground hover:text-foreground"
                }`}
                style={subjectFilter === s.id ? { backgroundColor: s.color } : {}}
              >
                {s.emoji} {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {quizzes.length === 0 ? (
        <Card variant="glass" className="border-dashed border-primary/30">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Target size={28} className="text-primary" />
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
          {filtered.map((quiz) => {
            const lastAttempt = quiz.attempts[0] ?? null;
            return (
              <Card key={quiz.id} variant="glass" className="hover:scale-[1.01] transition-transform">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base line-clamp-2">
                      {quiz.title}
                    </CardTitle>
                    <QuizTypeBadge type={quiz.quizType} />
                  </div>
                  {quiz.document && (
                    <CardDescription className="flex items-center gap-1.5 truncate">
                      {quiz.document.discipline && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded-full text-white shrink-0"
                          style={{ backgroundColor: quiz.document.discipline.color }}
                        >
                          {quiz.document.discipline.emoji}
                        </span>
                      )}
                      <span className="truncate">{quiz.document.title}</span>
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{t("questions", { count: quiz._count.questions })}</span>
                    <span>{t("attempts", { count: quiz._count.attempts })}</span>
                  </div>
                  {lastAttempt && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">{t("lastAttempt")}</span>
                      <span
                        className={
                          lastAttempt.passed ? "text-green-600 font-medium" : "text-red-500 font-medium"
                        }
                      >
                        {lastAttempt.score !== null
                          ? `${Math.round(lastAttempt.score)}%`
                          : t("incomplete")}
                        {lastAttempt.passed ? " ✓" : " ✗"}
                      </span>
                    </div>
                  )}
                  <Link href={`/quizzes/${quiz.id}`}>
                    <Button size="sm" className="w-full">
                      {lastAttempt ? t("repeatQuiz") : t("startQuiz")}
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

function QuizTypeBadge({ type }: { type: string }) {
  const t = useTranslations("quizzes");
  const labels: Record<string, string> = {
    MULTIPLE_CHOICE: t("typeMultipleChoice"),
    MULTIPLE_SELECT: t("typeMultipleSelect"),
    TRUE_FALSE: t("typeTrueFalse"),
    OPEN_ANSWER: t("typeOpenAnswer"),
    MIXED: t("typeMixed"),
  };
  return (
    <Badge variant="secondary" className="shrink-0 text-xs">
      {labels[type] ?? type}
    </Badge>
  );
}
