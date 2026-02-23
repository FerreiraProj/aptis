import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { UploadZone } from "@/components/documents/upload-zone";

export const metadata = { title: "Carregar Documento" };

export default async function UploadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Carregar Documento</h1>
        <p className="text-muted-foreground">
          PDF, PowerPoint, texto, link YouTube ou foto dos teus apontamentos
        </p>
      </div>

      <UploadZone />
    </div>
  );
}
