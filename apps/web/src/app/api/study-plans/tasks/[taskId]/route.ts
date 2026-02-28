import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@aptis/database";
import { requireAuth, isAuthError } from "@/lib/auth/guards";

type Params = { params: Promise<{ taskId: string }> };

// PATCH /api/study-plans/tasks/[taskId] — toggle task completion
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  const { taskId } = await params;
  const { isCompleted } = (await request.json()) as { isCompleted: boolean };

  // Verify task belongs to a plan owned by this user
  const task = await prisma.studyPlanTask.findFirst({
    where: {
      id: taskId,
      day: { plan: { userId: auth.user.id } },
    },
    select: { id: true, dayId: true },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Update task completion
  await prisma.studyPlanTask.update({
    where: { id: taskId },
    data: { isCompleted },
  });

  // Update parent day's isCompleted if all tasks are done
  const siblingTasks = await prisma.studyPlanTask.findMany({
    where: { dayId: task.dayId },
    select: { id: true, isCompleted: true },
  });

  // Apply the current change optimistically for the check
  const allDone = siblingTasks.every((t) =>
    t.id === taskId ? isCompleted : t.isCompleted
  );

  await prisma.studyPlanDay.update({
    where: { id: task.dayId },
    data: { isCompleted: allDone },
  });

  return NextResponse.json({ ok: true });
}
