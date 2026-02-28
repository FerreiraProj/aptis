"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type PlanRow = {
  id: string;
  plan: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
  promoPriceMonthly: number | null;
  promoPriceYearly: number | null;
  currency: string;
  stripePriceIdMonthly: string | null;
  stripePriceIdYearly: string | null;
  features: string[];
  isPublic: boolean;
  trialDays: number;
};

const PLAN_ORDER = ["FREE", "PRO", "PREMIUM", "INSTITUTIONAL"];
const PLAN_COLORS: Record<string, string> = {
  FREE: "bg-gray-100 text-gray-700",
  PRO: "bg-blue-100 text-blue-700",
  PREMIUM: "bg-purple-100 text-purple-700",
  INSTITUTIONAL: "bg-green-100 text-green-700",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Partial<PlanRow>>>({});

  useEffect(() => {
    fetchPlans();
  }, []);

  async function fetchPlans() {
    const res = await fetch("/api/admin/plans");
    if (res.ok) {
      const { plans } = await res.json();
      const sorted = [...plans].sort(
        (a: PlanRow, b: PlanRow) =>
          PLAN_ORDER.indexOf(a.plan) - PLAN_ORDER.indexOf(b.plan)
      );
      setPlans(sorted);
      const initEdits: Record<string, Partial<PlanRow>> = {};
      sorted.forEach((p: PlanRow) => {
        initEdits[p.plan] = { ...p };
      });
      setEdits(initEdits);
    }
    setLoading(false);
  }

  function update(plan: string, field: keyof PlanRow, value: unknown) {
    setEdits((prev) => ({
      ...prev,
      [plan]: { ...prev[plan], [field]: value },
    }));
  }

  async function save(plan: string) {
    setSaving(plan);
    try {
      const res = await fetch(`/api/admin/plans/${plan}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edits[plan]),
      });
      if (!res.ok) throw new Error();
      toast.success(`Plano ${plan} guardado`);
    } catch {
      toast.error("Erro ao guardar plano");
    } finally {
      setSaving(null);
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
      <div>
        <h1 className="text-2xl font-bold">Planos</h1>
        <p className="text-muted-foreground">
          Configura preços, IDs Stripe e funcionalidades por plano
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {plans.map((p) => {
          const e = edits[p.plan] ?? {};
          return (
            <Card key={p.plan} variant="glass">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{p.name}</CardTitle>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded ${PLAN_COLORS[p.plan] ?? "bg-muted"}`}
                  >
                    {p.plan}
                  </span>
                </div>
                <CardDescription>
                  {p.plan === "FREE" || p.plan === "INSTITUTIONAL"
                    ? "Plano sem cobrança directa"
                    : `€${((e.priceMonthly ?? p.priceMonthly) / 100).toFixed(2)}/mês`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Name + Description */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Nome público</Label>
                    <Input
                      value={String(e.name ?? p.name)}
                      onChange={(ev) => update(p.plan, "name", ev.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Descrição curta</Label>
                    <Input
                      value={String(e.description ?? p.description ?? "")}
                      onChange={(ev) =>
                        update(p.plan, "description", ev.target.value || null)
                      }
                    />
                  </div>
                </div>

                {/* Pricing */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Preço/mês (cêntimos)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={Number(e.priceMonthly ?? p.priceMonthly)}
                      onChange={(ev) =>
                        update(p.plan, "priceMonthly", parseInt(ev.target.value) || 0)
                      }
                      placeholder="1500 = €15"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Preço/ano (cêntimos)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={Number(e.priceYearly ?? p.priceYearly)}
                      onChange={(ev) =>
                        update(p.plan, "priceYearly", parseInt(ev.target.value) || 0)
                      }
                      placeholder="14400 = €144"
                    />
                  </div>
                </div>

                {/* Promo pricing */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Preço promo/mês{" "}
                      <span className="text-muted-foreground">(opcional)</span>
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={
                        (e.promoPriceMonthly ?? p.promoPriceMonthly) != null
                          ? String(e.promoPriceMonthly ?? p.promoPriceMonthly)
                          : ""
                      }
                      onChange={(ev) =>
                        update(
                          p.plan,
                          "promoPriceMonthly",
                          ev.target.value ? parseInt(ev.target.value) : null
                        )
                      }
                      placeholder="900 = €9 (preço riscado no site)"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Preço promo/ano{" "}
                      <span className="text-muted-foreground">(opcional)</span>
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={
                        (e.promoPriceYearly ?? p.promoPriceYearly) != null
                          ? String(e.promoPriceYearly ?? p.promoPriceYearly)
                          : ""
                      }
                      onChange={(ev) =>
                        update(
                          p.plan,
                          "promoPriceYearly",
                          ev.target.value ? parseInt(ev.target.value) : null
                        )
                      }
                      placeholder="Deixa vazio para desativar"
                    />
                  </div>
                </div>

                {/* Stripe */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Stripe Price ID mensal</Label>
                    <Input
                      value={String(
                        e.stripePriceIdMonthly ?? p.stripePriceIdMonthly ?? ""
                      )}
                      onChange={(ev) =>
                        update(
                          p.plan,
                          "stripePriceIdMonthly",
                          ev.target.value || null
                        )
                      }
                      placeholder="price_..."
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Stripe Price ID anual</Label>
                    <Input
                      value={String(
                        e.stripePriceIdYearly ?? p.stripePriceIdYearly ?? ""
                      )}
                      onChange={(ev) =>
                        update(
                          p.plan,
                          "stripePriceIdYearly",
                          ev.target.value || null
                        )
                      }
                      placeholder="price_... (opcional)"
                      className="font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Trial days */}
                <div className="space-y-1">
                  <Label className="text-xs">Dias de trial gratuito</Label>
                  <Input
                    type="number"
                    min="0"
                    max="30"
                    value={Number(e.trialDays ?? p.trialDays)}
                    onChange={(ev) =>
                      update(p.plan, "trialDays", parseInt(ev.target.value) || 0)
                    }
                    className="w-24"
                  />
                </div>

                {/* Features */}
                <div className="space-y-1">
                  <Label className="text-xs">
                    Funcionalidades{" "}
                    <span className="text-muted-foreground">(uma por linha)</span>
                  </Label>
                  <textarea
                    rows={5}
                    value={(e.features ?? p.features).join("\n")}
                    onChange={(ev) =>
                      update(
                        p.plan,
                        "features",
                        ev.target.value
                          .split("\n")
                          .map((s) => s.trim())
                          .filter(Boolean)
                      )
                    }
                    className="w-full glass-sm rounded-xl px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 bg-transparent border border-white/30 dark:border-white/10"
                  />
                  <p className="text-xs text-muted-foreground">
                    {(e.features ?? p.features).length} item(s)
                  </p>
                </div>

                {/* Visibility */}
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(e.isPublic ?? p.isPublic)}
                    onChange={(ev) => update(p.plan, "isPublic", ev.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                  Visível na página de preços
                </label>

                <Button
                  className="w-full"
                  onClick={() => save(p.plan)}
                  disabled={saving === p.plan}
                >
                  {saving === p.plan ? "A guardar..." : "Guardar plano"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
