import { createClient } from "@/lib/supabase/server";
import { prisma } from "@aptis/database";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export const metadata = { title: "Flashcards" };

export default async function FlashcardsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const now = new Date();

  const [dueCount, totalCount, flashcards] = await Promise.all([
    prisma.flashcard.count({
      where: { userId: user.id, smDueDate: { lte: now } },
    }),
    prisma.flashcard.count({ where: { userId: user.id } }),
    prisma.flashcard.findMany({
      where: { userId: user.id },
      orderBy: { smDueDate: "asc" },
      take: 50,
      select: {
        id: true,
        front: true,
        back: true,
        topic: true,
        difficulty: true,
        smDueDate: true,
        smInterval: true,
        document: { select: { id: true, title: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Flashcards</h1>
          <p className="text-muted-foreground">{totalCount} no total</p>
        </div>
        <div className="flex gap-2">
          {dueCount > 0 && (
            <Link href="/flashcards/review">
              <Button>⚡ Rever {dueCount} hoje</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className={dueCount > 0 ? "border-primary" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Para rever hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dueCount}</div>
            {dueCount > 0 ? (
              <Link href="/flashcards/review">
                <Button size="sm" className="mt-3 w-full">
                  Começar revisão
                </Button>
              </Link>
            ) : (
              <p className="text-xs text-green-600 mt-1">✓ Tudo em dia!</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">flashcards</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Em ordem
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalCount - dueCount}</div>
            <p className="text-xs text-muted-foreground">não precisam revisão</p>
          </CardContent>
        </Card>
      </div>

      {totalCount === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="text-5xl">🃏</div>
            <div>
              <h3 className="font-semibold">Nenhum flashcard ainda</h3>
              <p className="text-sm text-muted-foreground">
                Carrega um documento e gera flashcards com IA
              </p>
            </div>
            <Link href="/upload">
              <Button>Carregar documento</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Todos os flashcards</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {flashcards.map((card) => {
              const isDue = card.smDueDate <= now;
              return (
                <Card
                  key={card.id}
                  className={isDue ? "border-primary/50" : ""}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm font-medium line-clamp-2">
                        {card.front}
                      </CardTitle>
                      {isDue && (
                        <Badge className="shrink-0 text-xs">Para rever</Badge>
                      )}
                    </div>
                    {card.topic && (
                      <CardDescription>{card.topic}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {card.back}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <DifficultyBadge difficulty={card.difficulty} />
                      {card.smInterval > 0 && (
                        <span className="text-xs text-muted-foreground">
                          Intervalo: {card.smInterval}d
                        </span>
                      )}
                    </div>
                    {card.document && (
                      <Link
                        href={`/documents/${card.document.id}`}
                        className="mt-2 block text-xs text-primary hover:underline truncate"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {card.document.title}
                      </Link>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const config: Record<string, { label: string; className: string }> = {
    EASY: { label: "Fácil", className: "bg-green-100 text-green-800" },
    MEDIUM: { label: "Médio", className: "bg-yellow-100 text-yellow-800" },
    HARD: { label: "Difícil", className: "bg-red-100 text-red-800" },
  };
  const c = config[difficulty] ?? { label: difficulty, className: "" };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.className}`}
    >
      {c.label}
    </span>
  );
}
