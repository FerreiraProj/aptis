import { createClient } from "@/lib/supabase/server";
import { prisma } from "@aptis/database";
import { redirect } from "next/navigation";
import { UploadZone } from "@/components/documents/upload-zone";
import { getTranslations } from "next-intl/server";

export const metadata = { title: "Upload" };

export default async function UploadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const t = await getTranslations("upload");

  const subjects = await prisma.subject.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, emoji: true, color: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("description")}
        </p>
      </div>

      <UploadZone subjects={subjects} />
    </div>
  );
}
