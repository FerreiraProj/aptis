import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@aptis/database";
import { requireAuth, isAuthError } from "@/lib/auth/guards";
import { checkRateLimit, getUserPlan } from "@/lib/rate-limit";
import { generateStudyPlan } from "@/lib/ai/study-plan-generator";
import { requireFeature } from "@/lib/usage";

// POST /api/study-plans — generate + save a new study plan
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  // Rate limit: plan-aware study plan generation
  const plan = await getUserPlan(auth.user.id);
  const locked = requireFeature(plan, "studyPlan");
  if (locked) return locked;

  const rateLimit = await checkRateLimit("studyPlan", auth.user.id, plan);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Limite diário de planos atingido. Tenta novamente amanhã." },
      { status: 429 }
    );
  }

  const body = await request.json();
  const { documentIds, examDate, hoursPerDay, gradeGoal } = body as {
    documentIds: string[];
    examDate: string; // ISO date string
    hoursPerDay: number;
    gradeGoal: string | null;
  };

  if (!documentIds?.length || !examDate || !hoursPerDay) {
    return NextResponse.json(
      { error: "documentIds, examDate and hoursPerDay are required" },
      { status: 400 }
    );
  }

  // Verify all documents belong to user and are READY
  const documents = await prisma.document.findMany({
    where: {
      id: { in: documentIds },
      userId: auth.user.id,
      status: "READY",
    },
    select: {
      id: true,
      title: true,
      topics: true,
      extractedText: true,
      discipline: { select: { name: true } },
    },
  });

  if (documents.length === 0) {
    return NextResponse.json(
      { error: "No valid documents found" },
      { status: 404 }
    );
  }

  // Get user's studyNiche for the prompt
  const dbUser = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { studyNiche: true },
  });

  // Calculate days until exam (cap 21, min 3)
  const examMs = new Date(examDate).getTime();
  const todayMs = Date.now();
  const daysUntilExam = Math.max(
    3,
    Math.min(21, Math.ceil((examMs - todayMs) / 86_400_000))
  );

  // Generate plan with AI (combine topics from all selected documents)
  let generatedPlan;
  try {
    generatedPlan = await generateStudyPlan({
      documents: documents.map((d) => ({
        title: d.title,
        topics: d.topics,
        excerpt: d.extractedText ? d.extractedText.slice(0, 500) : null,
        subjectName: d.discipline?.name ?? null,
      })),
      daysToGenerate: daysUntilExam,
      hoursPerDay,
      gradeGoal: gradeGoal ?? null,
      studyNiche: dbUser?.studyNiche ?? null,
      userId: auth.user.id,
    });
  } catch (error) {
    console.error("[study-plans] AI generation failed:", error);
    return NextResponse.json(
      { error: "Falha na geração do plano. Tenta novamente." },
      { status: 500 }
    );
  }

  // Deactivate any existing active plans
  await prisma.studyPlan.updateMany({
    where: { userId: auth.user.id, isActive: true },
    data: { isActive: false },
  });

  // Build day start date = tomorrow
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 1);
  startDate.setHours(0, 0, 0, 0);

  // Persist the plan (documentId = first doc for the FK relation)
  const savedPlan = await prisma.studyPlan.create({
    data: {
      userId: auth.user.id,
      documentId: documents[0].id,
      documentIds,
      title: generatedPlan.title,
      examDate: new Date(examDate),
      hoursPerDay,
      gradeGoal: gradeGoal ?? "",
      isActive: true,
      days: {
        create: generatedPlan.days.map((day) => {
          const dayDate = new Date(startDate);
          dayDate.setDate(startDate.getDate() + day.dayNumber - 1);

          const totalMinutes = day.tasks.reduce(
            (sum, t) => sum + t.durationMin,
            0
          );

          return {
            dayNumber: day.dayNumber,
            date: dayDate,
            totalMinutes,
            isCompleted: false,
            tasks: {
              create: day.tasks.map((task, i) => ({
                taskType: task.taskType,
                title: task.title,
                description: task.description,
                durationMin: task.durationMin,
                topic: task.topic,
                isCompleted: false,
                taskOrder: i,
              })),
            },
          };
        }),
      },
    },
    include: {
      days: {
        orderBy: { dayNumber: "asc" },
        include: { tasks: { orderBy: { taskOrder: "asc" } } },
      },
    },
  });

  return NextResponse.json({ plan: savedPlan });
}
