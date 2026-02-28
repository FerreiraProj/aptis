import { createClient } from "@/lib/supabase/server";
import { prisma } from "@aptis/database";
import { redirect } from "next/navigation";
import { StudyPlanClient } from "./study-plan-client";

export const metadata = { title: "Plano de Estudo" };

export default async function StudyPlanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [dbUser, activePlan, documents, subjects] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        examDate: true,
        hoursPerDay: true,
        gradeGoal: true,
        studyNiche: true,
      },
    }),

    prisma.studyPlan.findFirst({
      where: { userId: user.id, isActive: true },
      include: {
        document: { select: { title: true } },
        days: {
          orderBy: { dayNumber: "asc" },
          include: {
            tasks: { orderBy: { taskOrder: "asc" } },
          },
        },
      },
    }),

    // Only show non-archived, READY documents in the plan creation form
    prisma.document.findMany({
      where: { userId: user.id, status: "READY", isArchived: false },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        discipline: { select: { id: true, name: true, emoji: true, color: true } },
      },
    }),

    prisma.subject.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, emoji: true, color: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <StudyPlanClient
      userProfile={{
        examDate: dbUser?.examDate?.toISOString() ?? null,
        hoursPerDay: dbUser?.hoursPerDay ?? null,
        gradeGoal: dbUser?.gradeGoal ?? null,
        studyNiche: dbUser?.studyNiche ?? null,
      }}
      documents={documents}
      subjects={subjects}
      activePlan={
        activePlan
          ? {
              ...activePlan,
              examDate: activePlan.examDate.toISOString(),
              documentIds: activePlan.documentIds,
              days: activePlan.days.map((d) => ({
                ...d,
                date: d.date.toISOString(),
              })),
            }
          : null
      }
    />
  );
}
