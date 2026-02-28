import { createClient } from "@/lib/supabase/server";
import { prisma } from "@aptis/database";
import { redirect } from "next/navigation";
import { ReviewSession } from "@/components/flashcards/review-session";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Revisão de Flashcards" };

export default async function FlashcardReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ documentId?: string; all?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { documentId, all } = await searchParams;
  const showAll = all === "1";
  const now = new Date();

  const dueCards = await prisma.flashcard.findMany({
    where: {
      userId: user.id,
      ...(documentId ? { documentId } : {}),
      ...(showAll ? {} : { smDueDate: { lte: now } }),
    },
    orderBy: { smDueDate: "asc" },
    take: 20,
  });

  // Fetch document title for the heading if filtering by document
  const docTitle = documentId
    ? (await prisma.document.findUnique({ where: { id: documentId }, select: { title: true } }))?.title
    : null;

  const backLink = "/flashcards";

  if (dueCards.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 py-16 text-center">
        <div className="text-6xl">✨</div>
        <div>
          <h2 className="text-2xl font-bold">Tudo em dia!</h2>
          <p className="text-muted-foreground">
            {docTitle
              ? `Não tens flashcards de "${docTitle}" para rever agora.`
              : "Não tens flashcards para rever agora. Volta mais tarde."}
          </p>
        </div>
        <Link href={backLink}>
          <Button variant="outline">← Voltar aos flashcards</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {showAll ? "Praticar" : "Revisão de Hoje"}
          </h1>
          <p className="text-muted-foreground">
            {dueCards.length} flashcard{dueCards.length !== 1 ? "s" : ""}
            {docTitle ? ` — ${docTitle}` : ""}
          </p>
        </div>
        <Link href={backLink}>
          <Button variant="ghost">← Todos os flashcards</Button>
        </Link>
      </div>

      <ReviewSession initialCards={dueCards} />
    </div>
  );
}
