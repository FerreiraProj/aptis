import { createClient } from "@/lib/supabase/server";
import { prisma } from "@aptis/database";
import { redirect, notFound } from "next/navigation";
import { ExamPlayer } from "./exam-player";

type Params = { params: Promise<{ quizId: string }> };

export default async function ExamSessionPage({ params }: Params) {
  const { quizId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const quiz = await prisma.quiz.findFirst({
    where: { id: quizId, document: { userId: user.id } },
    select: {
      id: true,
      title: true,
      quizType: true,
      passingScore: true,
      timeLimit: true,
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

  // Dynamic time limit based on question count and type:
  //   Multiple choice / True-False : 1.5 min (90 s) per question
  //   Open answer                  : 5 min (300 s) per question
  // Minimum 5 minutes, rounded to the nearest minute.
  const mcCount = quiz.questions.filter(
    (q) => q.questionType === "MULTIPLE_CHOICE" || q.questionType === "TRUE_FALSE"
  ).length;
  const openCount = quiz.questions.filter(
    (q) => q.questionType === "OPEN_ANSWER"
  ).length;
  const calcSeconds = mcCount * 90 + openCount * 300;
  const timeLimitSeconds =
    quiz.timeLimit ?? Math.max(5 * 60, Math.ceil(calcSeconds / 60) * 60);

  return <ExamPlayer quiz={quiz} timeLimitSeconds={timeLimitSeconds} />;
}
