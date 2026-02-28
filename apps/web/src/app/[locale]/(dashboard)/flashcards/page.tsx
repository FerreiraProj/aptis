import { createClient } from "@/lib/supabase/server";
import { prisma } from "@aptis/database";
import { redirect } from "next/navigation";
import { FlashcardsClient } from "./flashcards-client";

export const metadata = { title: "Flashcards" };

export default async function FlashcardsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const now = new Date();

  const [dueCount, totalCount, flashcards, subjects] = await Promise.all([
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
        document: {
          select: {
            id: true,
            title: true,
            discipline: { select: { id: true, name: true, emoji: true, color: true } },
          },
        },
      },
    }),
    prisma.subject.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, emoji: true, color: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <FlashcardsClient
      flashcards={flashcards}
      dueCount={dueCount}
      totalCount={totalCount}
      subjects={subjects}
    />
  );
}
