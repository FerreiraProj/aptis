import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@aptis/database";
import { requireAuth, isAuthError } from "@/lib/auth/guards";
import { getUserPlan } from "@/lib/rate-limit";
import { PLAN_LIMITS } from "@/lib/constants";

// GET /api/subjects — list user's subjects with document count
export async function GET() {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  const subjects = await prisma.subject.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { documents: true } } },
  });

  return NextResponse.json({ subjects });
}

// POST /api/subjects — create a subject (enforces plan limit)
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  const plan = await getUserPlan(auth.user.id);
  const maxSubjects = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS]?.subjectsMax ?? 1;

  const currentCount = await prisma.subject.count({
    where: { userId: auth.user.id },
  });

  if (currentCount >= maxSubjects) {
    return NextResponse.json(
      {
        error: `O teu plano ${plan} permite no máximo ${maxSubjects === Infinity ? "ilimitadas" : maxSubjects} disciplina${maxSubjects === 1 ? "" : "s"}. Faz upgrade para criar mais.`,
        code: "SUBJECT_LIMIT_REACHED",
      },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { name, emoji, color, description } = body as {
    name: string;
    emoji?: string;
    color?: string;
    description?: string;
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: "O nome é obrigatório" }, { status: 400 });
  }

  const subject = await prisma.subject.create({
    data: {
      userId: auth.user.id,
      name: name.trim(),
      emoji: emoji ?? "📚",
      color: color ?? "#0ea5e9",
      description: description?.trim() || null,
    },
    include: { _count: { select: { documents: true } } },
  });

  return NextResponse.json({ subject }, { status: 201 });
}
