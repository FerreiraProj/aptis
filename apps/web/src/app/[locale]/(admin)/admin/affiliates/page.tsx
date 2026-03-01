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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Check } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type CommissionType = "FIXED_EUR" | "PERCENTAGE";

type Partner = {
  id: string;
  name: string;
  email: string;
  code: string;
  commissionType: CommissionType;
  commissionValue: number;
  recurringCommissionType: CommissionType | null;
  recurringCommissionValue: number | null;
  recurringMonths: number;
  isActive: boolean;
  notes: string | null;
  totalReferrals: number;
  pendingCents: number;
  paidCents: number;
  createdAt: string;
};

type Commission = {
  id: string;
  amountCents: number;
  status: "PENDING" | "PAID" | "CANCELED";
  stripeInvoiceId: string | null;
  paidAt: string | null;
  createdAt: string;
};

type Referral = {
  id: string;
  referredUser: { email: string; fullName: string | null };
  convertedAt: string | null;
  commissions: Commission[];
};

// ─── Tab: Partners ────────────────────────────────────────────────────────────

function PartnersTab() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    code: "",
    commissionType: "PERCENTAGE",
    commissionValue: "10",
    recurringMonths: "0",
    recurringCommissionType: "PERCENTAGE",
    recurringCommissionValue: "",
    notes: "",
  });

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/affiliates");
    if (res.ok) setPartners(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createPartner() {
    setSaving(true);
    const res = await fetch("/api/admin/affiliates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        code: form.code || undefined,
        commissionType: form.commissionType,
        commissionValue: Number(form.commissionValue),
        recurringMonths: Number(form.recurringMonths),
        recurringCommissionType: form.recurringCommissionValue ? form.recurringCommissionType : undefined,
        recurringCommissionValue: form.recurringCommissionValue ? Number(form.recurringCommissionValue) : undefined,
        notes: form.notes || undefined,
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Parceiro criado");
      setShowForm(false);
      setForm({ name: "", email: "", code: "", commissionType: "PERCENTAGE", commissionValue: "10", recurringMonths: "0", recurringCommissionType: "PERCENTAGE", recurringCommissionValue: "", notes: "" });
      load();
    } else {
      const { error } = await res.json();
      toast.error(error ?? "Erro ao criar parceiro");
    }
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/admin/affiliates/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
    load();
  }

  function fmtComm(type: CommissionType, value: number) {
    return type === "FIXED_EUR" ? `${(value / 100).toFixed(2)} €` : `${value}%`;
  }

  function formatCommission(p: Partner) {
    const initial = fmtComm(p.commissionType, p.commissionValue);
    if (p.recurringMonths === 0) return initial;
    const recurringType = p.recurringCommissionType ?? p.commissionType;
    const recurringValue = p.recurringCommissionValue ?? p.commissionValue;
    const recurring = fmtComm(recurringType, recurringValue);
    return recurring === initial ? initial : `${initial} → ${recurring}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(!showForm)} className="btn-gradient" size="sm">
          <Plus size={14} className="mr-1" />
          Novo Parceiro
        </Button>
      </div>

      {showForm && (
        <Card className="glass-sm">
          <CardHeader>
            <CardTitle className="text-base">Novo Parceiro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Código (opcional — gerado auto.)</Label>
                <Input
                  placeholder="PROF-MARIA"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-1">
                <Label>Tipo de comissão</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={form.commissionType}
                  onChange={(e) => setForm({ ...form, commissionType: e.target.value })}
                >
                  <option value="PERCENTAGE">Percentagem (%)</option>
                  <option value="FIXED_EUR">Valor fixo (€ cêntimos)</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>{form.commissionType === "PERCENTAGE" ? "Percentagem (%)" : "Valor (cêntimos)"}</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.commissionValue}
                  onChange={(e) => setForm({ ...form, commissionValue: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Meses de recorrência (0 = só 1.º pagamento)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.recurringMonths}
                  onChange={(e) => setForm({ ...form, recurringMonths: e.target.value })}
                />
              </div>

              {Number(form.recurringMonths) > 0 && (
                <>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground mb-3 border-t pt-3">
                      Comissão recorrente — paga nos pagamentos seguintes ao 1.º (até {form.recurringMonths} meses).
                      Deixa o valor em branco para usar a mesma comissão do 1.º pagamento.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label>Tipo de comissão recorrente</Label>
                    <select
                      className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                      value={form.recurringCommissionType}
                      onChange={(e) => setForm({ ...form, recurringCommissionType: e.target.value })}
                    >
                      <option value="PERCENTAGE">Percentagem (%)</option>
                      <option value="FIXED_EUR">Valor fixo (€ cêntimos)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>
                      {form.recurringCommissionType === "PERCENTAGE" ? "Percentagem recorrente (%)" : "Valor recorrente (cêntimos)"}
                      <span className="text-muted-foreground ml-1">(opcional)</span>
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder={`Igual ao 1.º pagamento (${form.commissionValue})`}
                      value={form.recurringCommissionValue}
                      onChange={(e) => setForm({ ...form, recurringCommissionValue: e.target.value })}
                    />
                  </div>
                </>
              )}

              <div className="col-span-2 space-y-1">
                <Label>Notas internas</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={createPartner} disabled={saving} className="btn-gradient">
                {saving ? "A criar…" : "Criar Parceiro"}
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Nome / Email</th>
              <th className="text-left py-2">Código</th>
              <th className="text-left py-2">Comissão (1.º → recorrente)</th>
              <th className="text-left py-2">Recorrência</th>
              <th className="text-right py-2">Indicados</th>
              <th className="text-right py-2">Pendente</th>
              <th className="text-right py-2">Pago</th>
              <th className="text-center py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {partners.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="py-2">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-muted-foreground text-xs">{p.email}</div>
                </td>
                <td className="py-2 font-mono text-xs">{p.code}</td>
                <td className="py-2">{formatCommission(p)}</td>
                <td className="py-2 text-muted-foreground text-xs">
                  {p.recurringMonths === 0 ? "Sem recorrência" : `${p.recurringMonths} meses`}
                </td>
                <td className="py-2 text-right">{p.totalReferrals}</td>
                <td className="py-2 text-right text-amber-600">{(p.pendingCents / 100).toFixed(2)} €</td>
                <td className="py-2 text-right text-green-600">{(p.paidCents / 100).toFixed(2)} €</td>
                <td className="py-2 text-center">
                  <button onClick={() => toggleActive(p.id, p.isActive)}>
                    <Badge variant={p.isActive ? "default" : "secondary"}>
                      {p.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {partners.length === 0 && (
          <p className="text-muted-foreground text-sm py-8 text-center">Nenhum parceiro ainda.</p>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Commissions Report ──────────────────────────────────────────────────

function CommissionsTab() {
  const [report, setReport] = useState<{ partners: Partner[]; totals: { pendingCents: number; paidCents: number } } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<Record<string, Referral[]>>({});
  const [markingId, setMarkingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/affiliates/report")
      .then((r) => r.json())
      .then(setReport);
  }, []);

  async function loadReferrals(partnerId: string) {
    if (referrals[partnerId]) {
      setExpanded(expanded === partnerId ? null : partnerId);
      return;
    }
    const res = await fetch(`/api/admin/affiliates/${partnerId}/commissions`);
    if (res.ok) {
      const data = await res.json();
      setReferrals({ ...referrals, [partnerId]: data });
      setExpanded(partnerId);
    }
  }

  async function markPaid(partnerId: string, commissionId: string) {
    setMarkingId(commissionId);
    const res = await fetch(`/api/admin/affiliates/${partnerId}/commissions/${commissionId}/mark-paid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setMarkingId(null);
    if (res.ok) {
      toast.success("Comissão marcada como paga");
      // Reload referrals for this partner
      const r = await fetch(`/api/admin/affiliates/${partnerId}/commissions`);
      if (r.ok) setReferrals({ ...referrals, [partnerId]: await r.json() });
      // Reload totals
      const rep = await fetch("/api/admin/affiliates/report");
      if (rep.ok) setReport(await rep.json());
    } else {
      toast.error("Erro ao marcar como pago");
    }
  }

  if (!report) return <p className="text-muted-foreground">A carregar…</p>;

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Card className="glass-sm flex-1">
          <CardContent className="pt-4">
            <p className="text-muted-foreground text-xs">Total Pendente</p>
            <p className="text-2xl font-bold text-amber-600">{(report.totals.pendingCents / 100).toFixed(2)} €</p>
          </CardContent>
        </Card>
        <Card className="glass-sm flex-1">
          <CardContent className="pt-4">
            <p className="text-muted-foreground text-xs">Total Pago</p>
            <p className="text-2xl font-bold text-green-600">{(report.totals.paidCents / 100).toFixed(2)} €</p>
          </CardContent>
        </Card>
      </div>

      {report.partners.map((p) => (
        <Card key={p.id} className="glass-sm">
          <CardHeader
            className="cursor-pointer select-none"
            onClick={() => loadReferrals(p.id)}
          >
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{p.name}</CardTitle>
                <CardDescription>{p.code} · {p.email}</CardDescription>
              </div>
              <div className="flex gap-4 text-sm">
                <span className="text-amber-600">{(p.pendingCents / 100).toFixed(2)} € pendente</span>
                <span className="text-green-600">{(p.paidCents / 100).toFixed(2)} € pago</span>
              </div>
            </div>
          </CardHeader>

          {expanded === p.id && referrals[p.id] && (
            <CardContent>
              {referrals[p.id].map((ref) => (
                <div key={ref.id} className="mb-4">
                  <p className="text-sm font-medium mb-1">
                    {ref.referredUser.email}
                    {ref.convertedAt && (
                      <span className="text-muted-foreground text-xs ml-2">
                        convertido em {new Date(ref.convertedAt).toLocaleDateString("pt-PT")}
                      </span>
                    )}
                  </p>
                  <div className="space-y-1">
                    {ref.commissions.map((c) => (
                      <div key={c.id} className="flex items-center justify-between text-xs border rounded-md px-3 py-2">
                        <span>{new Date(c.createdAt).toLocaleDateString("pt-PT")}</span>
                        <span>{(c.amountCents / 100).toFixed(2)} €</span>
                        <Badge variant={c.status === "PAID" ? "default" : "secondary"}>
                          {c.status === "PAID" ? "Pago" : c.status === "CANCELED" ? "Cancelado" : "Pendente"}
                        </Badge>
                        {c.status === "PENDING" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={markingId === c.id}
                            onClick={() => markPaid(p.id, c.id)}
                          >
                            <Check size={12} className="mr-1" />
                            {markingId === c.id ? "…" : "Marcar pago"}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {referrals[p.id].length === 0 && (
                <p className="text-muted-foreground text-sm">Sem indicados ainda.</p>
              )}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = ["partners", "commissions"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = { partners: "Parceiros", commissions: "Relatório de Comissões" };

export default function AdminAffiliatesPage() {
  const [tab, setTab] = useState<Tab>("partners");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold gradient-text">Afiliados</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gestão de parceiros externos e comissões
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
        {tab === "partners" && <PartnersTab />}
        {tab === "commissions" && <CommissionsTab />}
      </div>
    </div>
  );
}
