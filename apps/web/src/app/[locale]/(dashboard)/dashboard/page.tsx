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
import { Upload, Zap, Target, MessageCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";

export const metadata = { title: "Dashboard" };

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

  const [dbUser, dueFlashcardsCount, recentDocuments, recentSessions] =
    await Promise.all([
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
      prisma.studySession.findMany({
        where: { userId: user.id },
        orderBy: { startedAt: "desc" },
        take: 7,
        select: {
          sessionType: true,
          cardsReviewed: true,
          correctAnswers: true,
          questionsAnswered: true,
          startedAt: true,
        },
      }),
    ]);

  const totalCardsReviewed = recentSessions.reduce(
    (sum, s) => sum + s.cardsReviewed,
    0
  );
  const accuracy =
    recentSessions.length > 0
      ? Math.round(
          (recentSessions.reduce((sum, s) => sum + s.correctAnswers, 0) /
            Math.max(
              recentSessions.reduce((sum, s) => sum + s.questionsAnswered, 0),
              1
            )) *
            100
        )
      : 0;

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {t("greeting", { name: dbUser?.fullName?.split(" ")[0] || "Estudante" })} 👋
          </h1>
          <p className="text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <Badge variant={planLabel === "FREE" ? "outline" : "default"}>
          {planLabel}
        </Badge>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title={t("dueToday")}
          value={String(dueFlashcardsCount)}
          description={t("dueDescription")}
          action={
            dueFlashcardsCount > 0
              ? { href: "/flashcards/review", label: t("reviewNow") }
              : undefined
          }
          highlight={dueFlashcardsCount > 0}
        />
        <StatCard
          title={t("reviewed7Days")}
          value={String(totalCardsReviewed)}
          description={t("reviewedDescription")}
        />
        <StatCard
          title={t("accuracy")}
          value={accuracy > 0 ? `${accuracy}%` : "—"}
          description={t("accuracyDescription")}
        />
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* Recent documents */}
      {recentDocuments.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("recentDocuments")}</h2>
            <Link
              href="/documents"
              className="text-sm text-primary hover:underline"
            >
              {t("viewAll")}
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {recentDocuments.map((doc) => (
              <Link key={doc.id} href={`/documents/${doc.id}`}>
                <Card variant="glass" className="cursor-pointer hover:scale-[1.01] transition-transform h-full">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {sourceTypeLabels[doc.sourceType] ?? doc.sourceType}
                        </p>
                      </div>
                      <StatusBadge status={doc.status} statusLabels={statusLabels} />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {recentDocuments.length === 0 && (
        <Card variant="glass" className="border-dashed border-primary/30">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Upload size={28} className="text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{t("emptyTitle")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("emptyDesc")}
              </p>
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

function StatCard({
  title,
  value,
  description,
  action,
  highlight,
}: {
  title: string;
  value: string;
  description: string;
  action?: { href: string; label: string };
  highlight?: boolean;
}) {
  return (
    <Card
      variant="glass"
      className={highlight ? "ring-2 ring-primary/40 shadow-lg shadow-primary/10" : ""}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
        {action && (
          <Link href={action.href}>
            <Button size="sm" className="mt-3 w-full">
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
      <Card variant="glass" className="cursor-pointer hover:scale-[1.02] transition-transform h-full">
        <CardContent className="p-4">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Icon size={18} className="text-primary" />
          </div>
          <h3 className="font-semibold text-sm">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
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
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    PENDING: "outline",
    PROCESSING: "secondary",
    READY: "default",
    FAILED: "destructive",
  };
  const label = statusLabels[status] ?? status;
  const variant = variants[status] ?? "outline";
  return <Badge variant={variant}>{label}</Badge>;
}
