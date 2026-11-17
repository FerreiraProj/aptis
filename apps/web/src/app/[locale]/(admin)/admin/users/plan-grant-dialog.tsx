"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const PLANS = ["FREE", "PRO", "PREMIUM", "INSTITUTIONAL"] as const;
type Plan = (typeof PLANS)[number];

type Props = {
  userId: string;
  email: string;
  currentPlan: string;
  override: { plan: string; expiresAt: string | null } | null;
};

export function PlanGrantDialog({ userId, email, currentPlan, override }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<Plan>((override?.plan as Plan) ?? "PRO");
  const [mode, setMode] = useState<"months" | "indefinite">(
    override && !override.expiresAt ? "indefinite" : "months"
  );
  const [months, setMonths] = useState("1");
  const [saving, setSaving] = useState(false);

  async function grant() {
    const m = Number(months);
    if (mode === "months" && (!Number.isInteger(m) || m < 1 || m > 120)) {
      toast.error("Indica um número de meses entre 1 e 120");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/admin/users/${userId}/plan`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, months: mode === "indefinite" ? null : m }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Erro ao atribuir plano");
      return;
    }
    toast.success(
      `${plan} atribuído a ${email} ${mode === "indefinite" ? "sem data limite" : `por ${m} ${m === 1 ? "mês" : "meses"}`}`
    );
    setOpen(false);
    router.refresh();
  }

  async function revoke() {
    if (!confirm(`Remover o plano atribuído a ${email}? Volta ao plano do Stripe (ou FREE).`)) return;
    setSaving(true);
    const res = await fetch(`/api/admin/users/${userId}/plan`, { method: "DELETE" });
    setSaving(false);
    if (!res.ok) {
      toast.error("Erro ao remover plano");
      return;
    }
    toast.success("Plano atribuído removido");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Alterar plano
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar plano</DialogTitle>
          <DialogDescription>
            {email} — plano atual: <strong>{currentPlan}</strong>. O plano atribuído aqui não passa
            pelo Stripe e sobrepõe-se à subscrição enquanto estiver ativo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="grant-plan">Plano</Label>
            <select
              id="grant-plan"
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              value={plan}
              onChange={(e) => setPlan(e.target.value as Plan)}
            >
              {PLANS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Duração</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="grant-duration"
                checked={mode === "months"}
                onChange={() => setMode("months")}
              />
              Durante
              <Input
                type="number"
                min={1}
                max={120}
                className="w-20 h-8"
                value={months}
                disabled={mode !== "months"}
                onChange={(e) => setMonths(e.target.value)}
              />
              meses
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="grant-duration"
                checked={mode === "indefinite"}
                onChange={() => setMode("indefinite")}
              />
              Indefinidamente
            </label>
          </fieldset>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            {override ? (
              <Button variant="ghost" className="text-destructive" onClick={revoke} disabled={saving}>
                Remover plano atribuído
              </Button>
            ) : (
              <span />
            )}
            <Button onClick={grant} disabled={saving}>
              {saving ? "A guardar…" : "Guardar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
