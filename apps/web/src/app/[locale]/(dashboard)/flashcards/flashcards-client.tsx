"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Zap, BookOpen } from "lucide-react";

type Subject = { id: string; name: string; emoji: string; color: string };

type Flashcard = {
  id: string;
  front: string;
  back: string;
  topic: string | null;
  difficulty: string;
  smDueDate: Date;
  smInterval: number;
  document: { id: string; title: string; discipline: Subject | null } | null;
};

type DocumentGroup = {
  id: string;
  title: string;
  discipline: Subject | null;
  total: number;
  due: number;
};

export function FlashcardsClient({
  flashcards,
  dueCount,
  totalCount,
  subjects,
}: {
  flashcards: Flashcard[];
  dueCount: number;
  totalCount: number;
  subjects: Subject[];
}) {
  const t = useTranslations("flashcards");
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const now = new Date();

  // Group flashcards by document
  const docMap = new Map<string, DocumentGroup>();
  for (const card of flashcards) {
    if (!card.document) continue;
    const key = card.document.id;
    if (!docMap.has(key)) {
      docMap.set(key, {
        id: card.document.id,
        title: card.document.title,
        discipline: card.document.discipline,
        total: 0,
        due: 0,
      });
    }
    const group = docMap.get(key)!;
    group.total++;
    if (card.smDueDate <= now) group.due++;
  }

  const groups = Array.from(docMap.values()).sort((a, b) => b.due - a.due);

  const filteredGroups = subjectFilter
    ? groups.filter((g) => g.discipline?.id === subjectFilter)
    : groups;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{totalCount} {t("total").toLowerCase()}</p>
        </div>
        {dueCount > 0 && (
          <Link href="/flashcards/review">
            <Button>
              <Zap size={15} className="mr-1.5" />
              {t("reviewDueToday", { count: dueCount })}
            </Button>
          </Link>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card
          variant="glass"
          className={dueCount > 0 ? "ring-2 ring-primary/40 shadow-lg shadow-primary/10" : ""}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("due")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dueCount}</div>
            {dueCount > 0 ? (
              <Link href="/flashcards/review">
                <Button size="sm" className="mt-3 w-full">
                  {t("startReview")}
                </Button>
              </Link>
            ) : (
              <p className="text-xs text-green-600 mt-1">{t("allUpToDate")}</p>
            )}
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("total")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">flashcards</p>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("upToDate")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalCount - dueCount}</div>
            <p className="text-xs text-muted-foreground">{t("noReviewNeeded")}</p>
          </CardContent>
        </Card>
      </div>

      {totalCount === 0 ? (
        <Card variant="glass" className="border-dashed border-primary/30">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Zap size={28} className="text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{t("noFlashcards")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("noFlashcardsDesc")}
              </p>
            </div>
            <Link href="/upload">
              <Button>{t("uploadDocument")}</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Title + subject filter */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold">{t("byDocument")}</h2>
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
                  {t("all")}
                </button>
                {subjects.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSubjectFilter(subjectFilter === s.id ? null : s.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                      subjectFilter === s.id
                        ? "text-white"
                        : "glass-sm text-muted-foreground hover:text-foreground"
                    }`}
                    style={subjectFilter === s.id ? { backgroundColor: s.color } : {}}
                  >
                    {s.emoji} {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Document cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredGroups.map((doc) => (
              <Card
                key={doc.id}
                variant="glass"
                className="hover:scale-[1.01] transition-transform"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base line-clamp-2 flex items-start gap-2">
                      <BookOpen size={16} className="shrink-0 text-primary mt-0.5" />
                      {doc.title}
                    </CardTitle>
                    {doc.due > 0 && (
                      <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                        {t("dueCount", { count: doc.due })}
                      </span>
                    )}
                  </div>
                  {doc.discipline && (
                    <CardDescription className="flex items-center gap-1.5">
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full text-white shrink-0"
                        style={{ backgroundColor: doc.discipline.color }}
                      >
                        {doc.discipline.emoji}
                      </span>
                      {doc.discipline.name}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {doc.total} flashcard{doc.total !== 1 ? "s" : ""}
                    {doc.due === 0 && (
                      <span className="ml-2 text-xs text-green-600">{t("allUpToDateShort")}</span>
                    )}
                  </p>
                  <div className="flex gap-2">
                    {doc.due > 0 ? (
                      <Link
                        href={`/flashcards/review?documentId=${doc.id}`}
                        className="flex-1"
                      >
                        <Button size="sm" className="w-full">
                          <Zap size={13} className="mr-1.5" />
                          {t("reviewDueToday", { count: doc.due })}
                        </Button>
                      </Link>
                    ) : (
                      <Link
                        href={`/flashcards/review?documentId=${doc.id}&all=1`}
                        className="flex-1"
                      >
                        <Button size="sm" variant="outline" className="w-full">
                          {t("practiceAll")}
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
