import { prisma } from "@aptis/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Admin — Uso da API" };

export default async function AdminUsagePage() {
  const [totals, recentLogs] = await Promise.all([
    prisma.apiUsageLog.groupBy({
      by: ["feature"],
      _sum: { inputTokens: true, outputTokens: true, costUsd: true },
      _count: { id: true },
      orderBy: { _sum: { costUsd: "desc" } },
    }),
    prisma.apiUsageLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        feature: true,
        model: true,
        inputTokens: true,
        outputTokens: true,
        costUsd: true,
        durationMs: true,
        createdAt: true,
        user: { select: { email: true } },
      },
    }),
  ]);

  const grandTotal = totals.reduce(
    (acc, t) => ({
      calls: acc.calls + t._count.id,
      inputTokens: acc.inputTokens + (t._sum.inputTokens ?? 0),
      outputTokens: acc.outputTokens + (t._sum.outputTokens ?? 0),
      costUsd: acc.costUsd + (t._sum.costUsd ?? 0),
    }),
    { calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 }
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Uso da API</h1>
        <p className="text-muted-foreground">Consumo acumulado de tokens e custo</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard title="Total chamadas" value={grandTotal.calls.toLocaleString("pt-PT")} />
        <StatCard title="Tokens entrada" value={grandTotal.inputTokens.toLocaleString("pt-PT")} />
        <StatCard title="Tokens saída" value={grandTotal.outputTokens.toLocaleString("pt-PT")} />
        <StatCard title="Custo total (USD)" value={`$${grandTotal.costUsd.toFixed(4)}`} />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Por funcionalidade</h2>
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Funcionalidade</th>
                <th className="px-4 py-3 text-right font-medium">Chamadas</th>
                <th className="px-4 py-3 text-right font-medium">Tokens entrada</th>
                <th className="px-4 py-3 text-right font-medium">Tokens saída</th>
                <th className="px-4 py-3 text-right font-medium">Custo (USD)</th>
              </tr>
            </thead>
            <tbody>
              {totals.map((t) => (
                <tr key={t.feature} className="border-b last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{t.feature}</td>
                  <td className="px-4 py-3 text-right">{t._count.id.toLocaleString("pt-PT")}</td>
                  <td className="px-4 py-3 text-right">{(t._sum.inputTokens ?? 0).toLocaleString("pt-PT")}</td>
                  <td className="px-4 py-3 text-right">{(t._sum.outputTokens ?? 0).toLocaleString("pt-PT")}</td>
                  <td className="px-4 py-3 text-right">${(t._sum.costUsd ?? 0).toFixed(4)}</td>
                </tr>
              ))}
              {totals.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Sem registos de uso ainda
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Últimas 50 chamadas</h2>
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Utilizador</th>
                <th className="px-4 py-3 text-left font-medium">Funcionalidade</th>
                <th className="px-4 py-3 text-left font-medium">Modelo</th>
                <th className="px-4 py-3 text-right font-medium">Tokens</th>
                <th className="px-4 py-3 text-right font-medium">Custo</th>
                <th className="px-4 py-3 text-right font-medium">Duração</th>
                <th className="px-4 py-3 text-left font-medium">Data</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map((log) => (
                <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{log.user?.email ?? "—"}</td>
                  <td className="px-4 py-3 text-xs">{log.feature}</td>
                  <td className="px-4 py-3 font-mono text-xs">{log.model}</td>
                  <td className="px-4 py-3 text-right">{(log.inputTokens + log.outputTokens).toLocaleString("pt-PT")}</td>
                  <td className="px-4 py-3 text-right">${log.costUsd.toFixed(5)}</td>
                  <td className="px-4 py-3 text-right">{log.durationMs}ms</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(log.createdAt).toLocaleString("pt-PT")}
                  </td>
                </tr>
              ))}
              {recentLogs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Sem registos ainda
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

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
