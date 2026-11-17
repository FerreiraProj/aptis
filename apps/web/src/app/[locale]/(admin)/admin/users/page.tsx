import { prisma } from "@aptis/database";
import { Badge } from "@/components/ui/badge";
import { isPlanOverrideActive, resolveUserPlan } from "@/lib/plans";
import { PlanGrantDialog } from "./plan-grant-dialog";

export const metadata = { title: "Admin — Utilizadores" };

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      createdAt: true,
      planOverride: true,
      planOverrideExpiresAt: true,
      subscription: { select: { plan: true, status: true, currentPeriodEnd: true } },
      _count: { select: { documents: true, flashcards: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Utilizadores</h1>
        <p className="text-muted-foreground">{users.length} utilizadores registados</p>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Nome</th>
              <th className="px-4 py-3 text-left font-medium">Role</th>
              <th className="px-4 py-3 text-left font-medium">Plano</th>
              <th className="px-4 py-3 text-left font-medium">Ações</th>
              <th className="px-4 py-3 text-left font-medium">Docs</th>
              <th className="px-4 py-3 text-left font-medium">Flashcards</th>
              <th className="px-4 py-3 text-left font-medium">Registado</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const plan = resolveUserPlan(u);
              const overrideActive = isPlanOverrideActive(u);
              return (
              <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs">{u.email}</td>
                <td className="px-4 py-3">{u.fullName || "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>
                    {u.role}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={plan === "FREE" ? "outline" : "default"}>{plan}</Badge>
                  {overrideActive && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Admin ·{" "}
                      {u.planOverrideExpiresAt
                        ? `até ${new Date(u.planOverrideExpiresAt).toLocaleDateString("pt-PT")}`
                        : "sem limite"}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <PlanGrantDialog
                    userId={u.id}
                    email={u.email}
                    currentPlan={plan}
                    override={
                      overrideActive && u.planOverride
                        ? {
                            plan: u.planOverride,
                            expiresAt: u.planOverrideExpiresAt?.toISOString() ?? null,
                          }
                        : null
                    }
                  />
                </td>
                <td className="px-4 py-3 text-center">{u._count.documents}</td>
                <td className="px-4 py-3 text-center">{u._count.flashcards}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(u.createdAt).toLocaleDateString("pt-PT")}
                </td>
              </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum utilizador encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
