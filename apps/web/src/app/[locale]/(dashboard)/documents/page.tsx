import { createClient } from "@/lib/supabase/server";
import { prisma } from "@aptis/database";
import { redirect } from "next/navigation";
import { DocumentsClient } from "./documents-client";

export const metadata = { title: "Documentos" };

export default async function DocumentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const docSelect = {
    id: true,
    title: true,
    status: true,
    sourceType: true,
    wordCount: true,
    pageCount: true,
    isArchived: true,
    subjectId: true,
    createdAt: true,
    _count: { select: { flashcards: true, quizzes: true } },
    discipline: { select: { name: true, color: true, emoji: true } },
  } as const;

  const [active, archived, subjects] = await Promise.all([
    prisma.document.findMany({
      where: { userId: user.id, isArchived: false },
      orderBy: { createdAt: "desc" },
      select: docSelect,
    }),
    prisma.document.findMany({
      where: { userId: user.id, isArchived: true },
      orderBy: { createdAt: "desc" },
      select: docSelect,
    }),
    prisma.subject.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, emoji: true, color: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return <DocumentsClient active={active} archived={archived} subjects={subjects} />;
}
