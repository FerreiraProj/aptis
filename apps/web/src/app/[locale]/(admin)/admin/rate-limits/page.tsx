"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type RLRow = {
  id: string;
  plan: string;
  action: string;
  requests: number;
  window: string;
  isUnlimited: boolean;
};

const PLANS = ["FREE", "PRO", "PREMIUM", "INSTITUTIONAL"] as const;
const ACTIONS = [
  { key: "generate", label: "Geração IA", desc: "Flashcards + Quiz" },
  { key: "chat", label: "Chat", desc: "Mensagens tutor IA" },
  { key: "upload", label: "Upload", desc: "Documentos" },
  { key: "studyPlan", label: "Plano", desc: "Plano de estudo" },
  { key: "grade", label: "Correção IA", desc: "Respostas abertas" },
] as const;

const WINDOWS = ["15 m", "30 m", "1 h", "6 h", "12 h", "1 d"] as const;

const PLAN_COLORS: Record<string, string> = {
  FREE: "text-gray-600",
  PRO: "text-blue-600",
  PREMIUM: "text-purple-600",
  INSTITUTIONAL: "text-green-600",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminRateLimitsPage() {
  const [rows, setRows] = useState<RLRow[]>([]);
  const [edits, setEdits] = useState<Record<string, RLRow>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/rate-limits")
      .then((r) => r.json())
      .then(({ configs }) => {
        setRows(configs);
        const map: Record<string, RLRow> = {};
        configs.forEach((r: RLRow) => {
          map[`${r.plan}:${r.action}`] = { ...r };
        });
        setEdits(map);
      })
      .finally(() => setLoading(false));
  }, []);

  function update(plan: string, action: string, field: keyof RLRow, value: unknown) {
    const key = `${plan}:${action}`;
    setEdits((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  }

  async function saveAll() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/rate-limits", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configs: Object.values(edits) }),
      });
      if (!res.ok) throw new Error();
      toast.success("Rate limits guardados. Activos em até 5 minutos.");
    } catch {
      toast.error("Erro ao guardar rate limits");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <p className="text-muted-foreground">A carregar...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Rate Limits</h1>
          <p className="text-muted-foreground">
            Define os limites de pedidos por plano e acção. As alterações ficam
            activas em até 5 minutos.
          </p>
        </div>
        <Button onClick={saveAll} disabled={saving} className="shrink-0">
          {saving ? "A guardar..." : "Guardar tudo"}
        </Button>
      </div>

      <div className="space-y-4">
        {PLANS.map((plan) => (
          <Card key={plan} variant="glass">
            <CardHeader className="pb-3">
              <CardTitle className={`text-base ${PLAN_COLORS[plan]}`}>
                Plano {plan}
              </CardTitle>
              <CardDescription>
                {plan === "INSTITUTIONAL"
                  ? "Marca como Ilimitado para remover todos os limites"
                  : "Define requests e janela temporal por acção"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {ACTIONS.map(({ key, label, desc }) => {
                  const rowKey = `${plan}:${key}`;
                  const row = edits[rowKey];
                  if (!row) return null;

                  return (
                    <div
                      key={key}
                      className={`glass-sm rounded-xl p-3 space-y-2 transition-opacity ${
                        row.isUnlimited ? "opacity-50" : ""
                      }`}
                    >
                      <div>
                        <p className="font-medium text-sm">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>

                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={row.isUnlimited}
                          onChange={(e) =>
                            update(plan, key, "isUnlimited", e.target.checked)
                          }
                          className="h-3.5 w-3.5 accent-primary"
                        />
                        Ilimitado
                      </label>

                      {!row.isUnlimited && (
                        <>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">
                              Pedidos
                            </label>
                            <Input
                              type="number"
                              min="1"
                              value={row.requests}
                              onChange={(e) =>
                                update(
                                  plan,
                                  key,
                                  "requests",
                                  parseInt(e.target.value) || 1
                                )
                              }
                              className="h-7 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">
                              Janela
                            </label>
                            <select
                              value={row.window}
                              onChange={(e) =>
                                update(plan, key, "window", e.target.value)
                              }
                              className="w-full glass-sm rounded-lg border border-white/30 dark:border-white/10 bg-transparent px-2 py-1 text-sm"
                            >
                              {WINDOWS.map((w) => (
                                <option key={w} value={w}>
                                  {w}
                                </option>
                              ))}
                            </select>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            = {row.requests}× / {row.window}
                          </p>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={saveAll} disabled={saving}>
          {saving ? "A guardar..." : "Guardar tudo"}
        </Button>
      </div>
    </div>
  );
}
