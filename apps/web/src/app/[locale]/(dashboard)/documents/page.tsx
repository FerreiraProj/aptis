import { createClient } from "@/lib/supabase/server";
import { prisma } from "@aptis/database";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Documentos" };

export default async function DocumentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const documents = await prisma.document.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      sourceType: true,
      wordCount: true,
      pageCount: true,
      createdAt: true,
      _count: {
        select: { flashcards: true, quizzes: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documentos</h1>
          <p className="text-muted-foreground">
            {documents.length} documento{documents.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/upload">
          <Button>+ Carregar</Button>
        </Link>
      </div>

      {documents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="text-5xl">📄</div>
            <div>
              <h3 className="font-semibold">Nenhum documento ainda</h3>
              <p className="text-sm text-muted-foreground">
                Carrega o teu primeiro documento para começar
              </p>
            </div>
            <Link href="/upload">
              <Button>Carregar documento</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <Link key={doc.id} href={`/documents/${doc.id}`}>
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">
                        {doc.title}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {sourceTypeLabel(doc.sourceType)} ·{" "}
                        {new Date(doc.createdAt).toLocaleDateString("pt-PT")}
                      </p>
                    </div>
                    <StatusBadge status={doc.status} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    {doc.wordCount && (
                      <span>{doc.wordCount.toLocaleString()} palavras</span>
                    )}
                    {doc.pageCount && <span>{doc.pageCount} págs.</span>}
                  </div>
                  {doc.status === "READY" && (
                    <div className="mt-3 flex gap-2">
                      <Badge variant="outline" className="text-xs">
                        {doc._count.flashcards} flashcards
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {doc._count.quizzes} quizzes
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
  > = {
    PENDING: { label: "Pendente", variant: "outline" },
    PROCESSING: { label: "A processar", variant: "secondary" },
    READY: { label: "Pronto", variant: "default" },
    FAILED: { label: "Erro", variant: "destructive" },
  };
  const c = config[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

function sourceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    PDF: "PDF",
    POWERPOINT: "PowerPoint",
    TEXT: "Texto",
    YOUTUBE: "YouTube",
    SCREENSHOT: "Imagem",
    IMAGE: "Imagem",
  };
  return labels[type] ?? type;
}
