import { prisma } from "@aptis/database";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PLAN_LIMITS } from "@/lib/constants";
import type { PlanKey } from "@/lib/constants";
import { SubjectsClient } from "./subjects-client";

export default async function SubjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [subjects, subscription] = await Promise.all([
    prisma.subject.findMany({
      where: { userId: user.id },
      include: { _count: { select: { documents: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.subscription.findUnique({
      where: { userId: user.id },
      select: { plan: true },
    }),
  ]);

  const plan = (subscription?.plan as PlanKey | undefined) ?? "FREE";
  const limit = PLAN_LIMITS[plan].subjectsMax;

  return (
    <SubjectsClient
      initialSubjects={subjects.map((s) => ({
        id: s.id,
        name: s.name,
        emoji: s.emoji,
        color: s.color,
        description: s.description,
        documentCount: s._count.documents,
      }))}
      plan={plan}
      limit={limit}
    />
  );
}
