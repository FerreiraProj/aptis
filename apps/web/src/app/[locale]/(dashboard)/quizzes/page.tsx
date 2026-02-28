import { createClient } from "@/lib/supabase/server";
import { prisma } from "@aptis/database";
import { redirect } from "next/navigation";
import { QuizzesClient } from "./quizzes-client";

export const metadata = { title: "Quizzes" };

export default async function QuizzesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [quizzes, subjects] = await Promise.all([
    prisma.quiz.findMany({
      where: { document: { userId: user.id } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        quizType: true,
        createdAt: true,
        document: {
          select: {
            id: true,
            title: true,
            discipline: { select: { id: true, name: true, emoji: true, color: true } },
          },
        },
        _count: { select: { questions: true, attempts: true } },
        attempts: {
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { score: true, passed: true, completedAt: true },
        },
      },
    }),
    prisma.subject.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, emoji: true, color: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return <QuizzesClient quizzes={quizzes} subjects={subjects} />;
}
