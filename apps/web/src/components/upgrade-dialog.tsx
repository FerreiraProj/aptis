"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check } from "lucide-react";

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
  features: string[];
  trialDays: number;
};

type Interval = "monthly" | "yearly";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPrice(cents: number): string {
  if (cents === 0) return "Grátis";
  const euros = cents / 100;
  return `€${euros % 1 === 0 ? euros.toFixed(0) : euros.toFixed(2)}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface UpgradeDialogProps {
  open: boolean;
  onClose: () => void;
}

export function UpgradeDialog({ open, onClose }: UpgradeDialogProps) {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [interval, setInterval] = useState<Interval>("monthly");
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/pricing")
      .then((r) => r.json())
      .then(({ plans: rows }: { plans: PlanRow[] }) => {
        setPlans(rows.filter((p) => p.plan === "PRO" || p.plan === "PREMIUM"));
      })
      .catch(() => toast.error("Erro ao carregar planos"))
      .finally(() => setLoading(false));
  }, [open]);

  async function startCheckout(planTier: string) {
    setCheckoutLoading(planTier);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planTier, interval }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error ?? `Erro ${res.status}`);
      }
      if (!data.url) {
        throw new Error("URL de checkout não recebida");
      }
      window.location.href = data.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao iniciar checkout");
      setCheckoutLoading(null);
    }
  }

  function yearlySavings(p: PlanRow): string | null {
    if (!p.priceYearly || !p.priceMonthly) return null;
    const monthlyTotal = p.priceMonthly * 12;
    const saved = monthlyTotal - p.priceYearly;
    if (saved <= 0) return null;
    return `-${fmtPrice(saved)}/ano`;
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass border-0 rounded-3xl shadow-2xl max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-xl">Escolhe o teu plano</DialogTitle>
          <DialogDescription>
            Começa com um período de teste gratuito. Cancela quando quiseres.
          </DialogDescription>
        </DialogHeader>

        {/* Interval toggle */}
        <div className="flex justify-center px-6 pb-4">
          <div className="glass-sm inline-flex rounded-full p-1 text-sm">
            <button
              onClick={() => setInterval("monthly")}
              className={`rounded-full px-4 py-1.5 transition-all ${
                interval === "monthly"
                  ? "btn-gradient text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setInterval("yearly")}
              className={`rounded-full px-4 py-1.5 transition-all ${
                interval === "yearly"
                  ? "btn-gradient text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Anual
              {plans.some((p) => yearlySavings(p)) && (
                <span className="ml-1.5 rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">
                  poupa mais
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Plan cards */}
        <div className="px-6 pb-6">
          {loading ? (
            <div className="flex justify-center py-8 text-muted-foreground text-sm">
              A carregar planos...
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {plans.map((p) => {
                const isHighlighted = p.plan === "PRO";
                const displayCents =
                  interval === "yearly" ? p.priceYearly : p.priceMonthly;
                const promoCents =
                  interval === "yearly"
                    ? p.promoPriceYearly
                    : p.promoPriceMonthly;
                const activeCents = promoCents ?? displayCents;
                const savings = yearlySavings(p);

                return (
                  <div
                    key={p.plan}
                    className={`glass-sm rounded-2xl p-5 flex flex-col gap-4 ${
                      isHighlighted
                        ? "ring-2 ring-primary/40 shadow-lg shadow-primary/10"
                        : ""
                    }`}
                  >
                    {/* Header */}
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <h3 className="font-semibold text-base">{p.name}</h3>
                        {isHighlighted && (
                          <span className="btn-gradient rounded-full px-2.5 py-0.5 text-xs font-medium text-white">
                            Popular
                          </span>
                        )}
                      </div>
                      {p.description && (
                        <p className="text-xs text-muted-foreground">
                          {p.description}
                        </p>
                      )}
                    </div>

                    {/* Price */}
                    <div>
                      {promoCents != null && (
                        <p className="text-xs line-through text-muted-foreground">
                          {fmtPrice(displayCents)}
                        </p>
                      )}
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold">
                          {fmtPrice(activeCents)}
                        </span>
                        {activeCents > 0 && (
                          <span className="text-sm text-muted-foreground">
                            /{interval === "yearly" ? "ano" : "mês"}
                          </span>
                        )}
                      </div>
                      {interval === "yearly" && savings && (
                        <p className="text-xs text-green-600 font-medium mt-0.5">
                          {savings} vs mensal
                        </p>
                      )}
                      {p.trialDays > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {p.trialDays} dias grátis
                        </p>
                      )}
                    </div>

                    {/* Features */}
                    <ul className="flex-1 space-y-1.5 text-sm">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <Check size={14} className="text-primary shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <Button
                      className="w-full"
                      variant={isHighlighted ? "default" : "glass"}
                      onClick={() => startCheckout(p.plan)}
                      disabled={checkoutLoading !== null}
                    >
                      {checkoutLoading === p.plan
                        ? "A redirecionar..."
                        : `Escolher ${p.name}`}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
