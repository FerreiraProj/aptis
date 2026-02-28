import { createClient } from "@/lib/supabase/server";
import { prisma } from "@aptis/database";
import { redirect, notFound } from "next/navigation";
import { QuizPlayer } from "./quiz-player";

type Params = { params: Promise<{ id: string }> };

export default async function QuizDetailPage({ params }: Params) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const quiz = await prisma.quiz.findFirst({
    where: { id, document: { userId: user.id } },
    select: {
      id: true,
      title: true,
      quizType: true,
      passingScore: true,
      document: { select: { id: true, title: true } },
      questions: {
        orderBy: { questionIndex: "asc" },
        select: {
          id: true,
          questionText: true,
          questionType: true,
          explanation: true,
          difficulty: true,
          topic: true,
          points: true,
          options: {
            orderBy: { optionIndex: "asc" },
            select: { id: true, text: true, isCorrect: true },
          },
        },
      },
    },
  });

  if (!quiz) notFound();

  return <QuizPlayer quiz={quiz} userId={user.id} />;
}
