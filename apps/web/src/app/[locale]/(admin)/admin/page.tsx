import { prisma } from "@aptis/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveUserPlan } from "@/lib/plans";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const [totalUsers, totalDocuments, totalFlashcards, recentUsers] =
    await Promise.all([
      prisma.user.count(),
      prisma.document.count(),
      prisma.flashcard.count(),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          createdAt: true,
          planOverride: true,
          planOverrideExpiresAt: true,
          subscription: { select: { plan: true, status: true } },
        },
      }),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Painel de Administração</h1>
        <p className="text-muted-foreground">Visão geral da plataforma Aptis</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Utilizadores" value={totalUsers} icon="👥" />
        <StatCard title="Documentos" value={totalDocuments} icon="📄" />
        <StatCard title="Flashcards" value={totalFlashcards} icon="🃏" />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Utilizadores Recentes</h2>
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Nome</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Plano</th>
                <th className="px-4 py-3 text-left font-medium">Registado</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{u.email}</td>
                  <td className="px-4 py-3">{u.fullName || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        u.role === "ADMIN"
                          ? "font-semibold text-primary"
                          : "text-muted-foreground"
                      }
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {resolveUserPlan(u)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString("pt-PT")}
                  </td>
                </tr>
              ))}
              {recentUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum utilizador encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {icon} {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value.toLocaleString("pt-PT")}</div>
      </CardContent>
    </Card>
  );
}
