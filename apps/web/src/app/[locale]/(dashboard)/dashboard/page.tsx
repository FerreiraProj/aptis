import { createClient } from "@/lib/supabase/server";
import { prisma } from "@aptis/database";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Painel" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const now = new Date();

  // Parallel data fetching
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Olá, {dbUser?.fullName?.split(" ")[0] || "Estudante"} 👋
          </h1>
          <p className="text-muted-foreground">
            Continua assim. Cada revisão importa.
          </p>
        </div>
        <Badge variant={planLabel === "FREE" ? "outline" : "default"}>
          {planLabel}
        </Badge>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Para rever hoje"
          value={String(dueFlashcardsCount)}
          description="flashcards com prazo"
          action={
            dueFlashcardsCount > 0
              ? { href: "/flashcards/review", label: "Rever agora" }
              : undefined
          }
          highlight={dueFlashcardsCount > 0}
        />
        <StatCard
          title="Revistos (7 dias)"
          value={String(totalCardsReviewed)}
          description="flashcards"
        />
        <StatCard
          title="Precisão"
          value={accuracy > 0 ? `${accuracy}%` : "—"}
          description="nas últimas sessões"
        />
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickAction
          icon="📤"
          title="Carregar PDF"
          description="Transforma num plano de estudo"
          href="/upload"
        />
        <QuickAction
          icon="⚡"
          title="Rever Flashcards"
          description={`${dueFlashcardsCount} para rever`}
          href="/flashcards/review"
        />
        <QuickAction
          icon="🎯"
          title="Fazer Quiz"
          description="Testa os teus conhecimentos"
          href="/quizzes"
        />
        <QuickAction
          icon="💬"
          title="Perguntar ao Tutor"
          description="Chat com IA sobre os teus documentos"
          href="/chat"
        />
      </div>

      {/* Recent documents */}
      {recentDocuments.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Documentos Recentes</h2>
            <Link
              href="/documents"
              className="text-sm text-primary hover:underline"
            >
              Ver todos →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {recentDocuments.map((doc) => (
              <Link key={doc.id} href={`/documents/${doc.id}`}>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {sourceTypeLabel(doc.sourceType)}
                        </p>
                      </div>
                      <StatusBadge status={doc.status} />
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
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="text-5xl">📚</div>
            <div>
              <h3 className="font-semibold">Começa a estudar agora</h3>
              <p className="text-sm text-muted-foreground">
                Carrega o teu primeiro documento e gera flashcards em segundos
              </p>
            </div>
            <Link href="/upload">
              <Button>Carregar primeiro documento</Button>
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
    <Card className={highlight ? "border-primary" : ""}>
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
  icon,
  title,
  description,
  href,
}: {
  icon: string;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
        <CardContent className="p-4">
          <div className="text-2xl mb-2">{icon}</div>
          <h3 className="font-semibold text-sm">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    PENDING: { label: "Pendente", variant: "outline" },
    PROCESSING: { label: "A processar", variant: "secondary" },
    READY: { label: "Pronto", variant: "default" },
    FAILED: { label: "Erro", variant: "destructive" },
  };
  const config = variants[status] || { label: status, variant: "outline" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function sourceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    PDF: "PDF",
    POWERPOINT: "PowerPoint",
    TEXT: "Texto",
    YOUTUBE: "YouTube",
    SCREENSHOT: "Imagem",
    IMAGE: "Imagem",
  };
  return labels[type] || type;
}
