import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@aptis/database";
import { z } from "zod";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      subscription: {
        select: {
          plan: true,
          status: true,
          currentPeriodEnd: true,
        },
      },
    },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user: dbUser });
}

const UpdateProfileSchema = z.object({
  fullName: z.string().min(1).max(100).optional(),
  examDate: z.string().nullable().optional(),
  hoursPerDay: z.number().min(0.5).max(16).nullable().optional(),
  gradeGoal: z.string().max(20).nullable().optional(),
  preferredExplanationStyle: z
    .enum(["CONCISE", "DETAILED", "VISUAL", "ANALOGICAL"])
    .optional(),
});

export async function PUT(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = UpdateProfileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { fullName, examDate, hoursPerDay, gradeGoal, preferredExplanationStyle } =
    parsed.data;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(fullName !== undefined && { fullName }),
      ...(examDate !== undefined && {
        examDate: examDate ? new Date(examDate) : null,
      }),
      ...(hoursPerDay !== undefined && { hoursPerDay }),
      ...(gradeGoal !== undefined && { gradeGoal }),
      ...(preferredExplanationStyle !== undefined && {
        preferredExplanationStyle,
      }),
    },
  });

  return NextResponse.json({ user: updated });
}
