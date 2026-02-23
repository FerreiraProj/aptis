import { createClient } from "@/lib/supabase/server";
import { prisma } from "@aptis/database";
import { redirect } from "next/navigation";
import { ReviewSession } from "@/components/flashcards/review-session";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Revisão de Flashcards" };

export default async function FlashcardReviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const now = new Date();

  const dueCards = await prisma.flashcard.findMany({
    where: {
      userId: user.id,
      smDueDate: { lte: now },
    },
    orderBy: { smDueDate: "asc" },
    take: 20,
  });

  if (dueCards.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 py-16 text-center">
        <div className="text-6xl">✨</div>
        <div>
          <h2 className="text-2xl font-bold">Tudo em dia!</h2>
          <p className="text-muted-foreground">
            Não tens flashcards para rever agora. Volta mais tarde.
          </p>
        </div>
        <Link href="/flashcards">
          <Button variant="outline">Ver todos os flashcards</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Revisão de Hoje</h1>
          <p className="text-muted-foreground">
            {dueCards.length} flashcards para rever
          </p>
        </div>
        <Link href="/flashcards">
          <Button variant="ghost">← Todos os flashcards</Button>
        </Link>
      </div>

      <ReviewSession initialCards={dueCards} />
    </div>
  );
}
