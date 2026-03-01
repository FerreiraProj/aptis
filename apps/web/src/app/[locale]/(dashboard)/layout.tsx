import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@aptis/database";
import { getTranslations } from "next-intl/server";
import { Sidebar } from "@/components/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { studyNiche: true },
  });

  if (!dbUser?.studyNiche) {
    redirect("/onboarding");
  }

  const t = await getTranslations("nav");

  const navItems = [
    { href: "/dashboard", labelKey: "dashboard" },
    { href: "/upload", labelKey: "upload" },
    { href: "/documents", labelKey: "documents" },
    { href: "/subjects", labelKey: "subjects" },
    { href: "/flashcards", labelKey: "flashcards" },
    { href: "/flashcards/review", labelKey: "reviewToday" },
    { href: "/quizzes", labelKey: "quizzes" },
    { href: "/study-plan", labelKey: "studyPlan" },
    { href: "/progress", labelKey: "progress" },
    { href: "/chat", labelKey: "chat" },
    { href: "/exam-simulator", labelKey: "examSimulator" },
    { href: "/referral", labelKey: "referral" },
  ] as const;

  const translatedNavItems = navItems.map((item) => ({
    href: item.href,
    label: t(item.labelKey),
  }));

  const settingsLabel = t("settings");

  return (
    <div className="flex min-h-screen page-bg">
      <Sidebar items={translatedNavItems} settingsLabel={settingsLabel} />
      <main className="flex-1 overflow-auto min-w-0 pt-14 lg:pt-0">
        <div className="container mx-auto p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
