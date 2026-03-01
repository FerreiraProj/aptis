"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type DiscountConfig = {
  id: string;
  referralDiscountPct: number;
  earlyAdopterDiscountPct: number;
  loyaltyDiscountPct: number;
};

type Grant = {
  id: string;
  discountPct: number;
  grantedAt: string;
  user: { id: string; email: string; fullName: string | null };
  grantedBy: { email: string };
};

type EligibleUser = {
  id: string;
  email: string;
  fullName: string | null;
  subscription?: { createdAt: string } | null;
};

// ─── Tab: Config ─────────────────────────────────────────────────────────────

function ConfigTab() {
  const [config, setConfig] = useState<DiscountConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/discounts/config")
      .then((r) => r.json())
      .then(setConfig);
  }, []);

  async function save() {
    if (!config) return;
    setSaving(true);
    const res = await fetch("/api/admin/discounts/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        referralDiscountPct: config.referralDiscountPct,
        earlyAdopterDiscountPct: config.earlyAdopterDiscountPct,
        loyaltyDiscountPct: config.loyaltyDiscountPct,
      }),
    });
    setSaving(false);
    if (res.ok) toast.success("Configuração guardada");
    else toast.error("Erro ao guardar");
  }

  if (!config) return <p className="text-muted-foreground">A carregar…</p>;

  return (
    <div className="space-y-6 max-w-md">
      {(
        [
          ["referralDiscountPct", "Desconto de referral (%)"],
          ["earlyAdopterDiscountPct", "Desconto early adopter (%)"],
          ["loyaltyDiscountPct", "Desconto de fidelidade (%)"],
        ] as const
      ).map(([key, label]) => (
        <div key={key} className="space-y-1">
          <Label>{label}</Label>
          <Input
            type="number"
            min={1}
            max={100}
            value={config[key]}
            onChange={(e) =>
              setConfig({ ...config, [key]: Number(e.target.value) })
            }
          />
        </div>
      ))}
      <Button onClick={save} disabled={saving} className="btn-gradient">
        {saving ? "A guardar…" : "Guardar"}
      </Button>
    </div>
  );
}

// ─── Tab: Manual Discount (reusable for Early Adopter + Loyalty) ──────────────

function ManualDiscountTab({ type }: { type: "early-adopter" | "loyalty" }) {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [eligible, setEligible] = useState<EligibleUser[]>([]);
  const [grantingId, setGrantingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/discounts/${type}`);
    if (res.ok) {
      const data = await res.json();
      setGrants(data.grants);
      setEligible(data.eligible);
    }
  }, [type]);

  useEffect(() => { load(); }, [load]);

  async function grant(userId: string) {
    setGrantingId(userId);
    const res = await fetch(`/api/admin/discounts/${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setGrantingId(null);
    if (res.ok) { toast.success("Desconto atribuído"); load(); }
    else toast.error("Erro ao atribuir desconto");
  }

  async function revoke(userId: string) {
    setRevokingId(userId);
    const res = await fetch(`/api/admin/discounts/${type}/${userId}`, { method: "DELETE" });
    setRevokingId(null);
    if (res.ok) { toast.success("Desconto revogado"); load(); }
    else toast.error("Erro ao revogar desconto");
  }

  const label = type === "early-adopter" ? "Early Adopter" : "Fidelidade";

  return (
    <div className="space-y-8">
      <Card className="glass-sm">
        <CardHeader>
          <CardTitle className="text-base">Grants ativos — {label}</CardTitle>
          <CardDescription>{grants.length} utilizadores com desconto ativo</CardDescription>
        </CardHeader>
        <CardContent>
          {grants.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum grant ativo.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Email</th>
                  <th className="text-left py-2">%</th>
                  <th className="text-left py-2">Atribuído em</th>
                  <th className="text-left py-2">Por</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {grants.map((g) => (
                  <tr key={g.id} className="border-b last:border-0">
                    <td className="py-2">{g.user.email}</td>
                    <td className="py-2">{g.discountPct}%</td>
                    <td className="py-2">{new Date(g.grantedAt).toLocaleDateString("pt-PT")}</td>
                    <td className="py-2 text-muted-foreground">{g.grantedBy.email}</td>
                    <td className="py-2 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={revokingId === g.user.id}
                        onClick={() => revoke(g.user.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card className="glass-sm">
        <CardHeader>
          <CardTitle className="text-base">Utilizadores elegíveis</CardTitle>
          <CardDescription>Com subscrição ativa{type === "loyalty" ? " há 6+ meses" : ""}</CardDescription>
        </CardHeader>
        <CardContent>
          {eligible.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum utilizador elegível de momento.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Email</th>
                  {type === "loyalty" && <th className="text-left py-2">Subscrição desde</th>}
                  <th />
                </tr>
              </thead>
              <tbody>
                {eligible.map((u) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="py-2">{u.email}</td>
                    {type === "loyalty" && (
                      <td className="py-2 text-muted-foreground">
                        {u.subscription?.createdAt
                          ? new Date(u.subscription.createdAt).toLocaleDateString("pt-PT")
                          : "—"}
                      </td>
                    )}
                    <td className="py-2 text-right">
                      <Button
                        size="sm"
                        className="btn-gradient"
                        disabled={grantingId === u.id}
                        onClick={() => grant(u.id)}
                      >
                        {grantingId === u.id ? "…" : "Atribuir"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = ["config", "early-adopter", "loyalty"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  config: "Configuração",
  "early-adopter": "Early Adopter",
  loyalty: "Fidelidade",
};

export default function AdminDiscountsPage() {
  const [tab, setTab] = useState<Tab>("config");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold gradient-text">Descontos</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gestão de descontos manuais e configuração de percentagens
        </p>
      </div>

      <div className="flex gap-2 border-b">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <div>
        {tab === "config" && <ConfigTab />}
        {tab === "early-adopter" && <ManualDiscountTab type="early-adopter" />}
        {tab === "loyalty" && <ManualDiscountTab type="loyalty" />}
      </div>
    </div>
  );
}
