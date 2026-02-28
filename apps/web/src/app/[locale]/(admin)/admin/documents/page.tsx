import { prisma } from "@aptis/database";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Admin — Documentos" };

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING:    { label: "Pendente",      variant: "outline" },
  PROCESSING: { label: "A processar",  variant: "secondary" },
  READY:      { label: "Pronto",        variant: "default" },
  FAILED:     { label: "Erro",          variant: "destructive" },
};

export default async function AdminDocumentsPage() {
  const documents = await prisma.document.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      sourceType: true,
      status: true,
      wordCount: true,
      pageCount: true,
      sizeBytes: true,
      errorMessage: true,
      createdAt: true,
      user: { select: { email: true } },
    },
  });

  const total = await prisma.document.count();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Documentos</h1>
        <p className="text-muted-foreground">{total} documentos no total (a mostrar os últimos 100)</p>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Título</th>
              <th className="px-4 py-3 text-left font-medium">Utilizador</th>
              <th className="px-4 py-3 text-left font-medium">Tipo</th>
              <th className="px-4 py-3 text-left font-medium">Estado</th>
              <th className="px-4 py-3 text-left font-medium">Páginas</th>
              <th className="px-4 py-3 text-left font-medium">Palavras</th>
              <th className="px-4 py-3 text-left font-medium">Data</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => {
              const s = STATUS_LABELS[doc.status] ?? { label: doc.status, variant: "outline" as const };
              return (
                <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 max-w-[200px] truncate" title={doc.title}>
                    {doc.title}
                    {doc.errorMessage && (
                      <p className="text-xs text-destructive truncate">{doc.errorMessage}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{doc.user.email}</td>
                  <td className="px-4 py-3">{doc.sourceType}</td>
                  <td className="px-4 py-3">
                    <Badge variant={s.variant}>{s.label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-center">{doc.pageCount ?? "—"}</td>
                  <td className="px-4 py-3 text-center">{doc.wordCount?.toLocaleString("pt-PT") ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(doc.createdAt).toLocaleDateString("pt-PT")}
                  </td>
                </tr>
              );
            })}
            {documents.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum documento encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
