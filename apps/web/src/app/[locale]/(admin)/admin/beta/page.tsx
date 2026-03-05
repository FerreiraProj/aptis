"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { AlertTriangle, Users, Clock, CheckCircle, XCircle } from "lucide-react";

type SiteConfig = { id: string; betaModeEnabled: boolean };
type Stats = { total: number; pending: number; approved: number; rejected: number };
type Application = {
  id: string;
  email: string;
  studyLevel: string;
  disciplines: string;
  feedbackCommitment: string;
  status: string;
  notes: string | null;
  createdAt: string;
};

const STUDY_LEVEL_LABELS: Record<string, string> = {
  SECONDARY: "Ensino Secundário",
  UNIVERSITY: "Universidade",
  EXAM_PREP: "Preparação p/ exame",
  OTHER: "Outro",
};

const FEEDBACK_LABELS: Record<string, string> = {
  YES: "Sim",
  YES_DETAILED: "Sim, detalhado",
  JUST_TRY: "Só experimentar",
};

export default function BetaPage() {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [applications, setApplications] = useState<Application[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [tab, setTab] = useState<"config" | "applications">("config");
  const [saving, setSaving] = useState(false);
  const [loadingApps, setLoadingApps] = useState(false);

  // Approve dialog state
  const [approveTarget, setApproveTarget] = useState<Application | null>(null);
  const [approvePassword, setApprovePassword] = useState("");
  const [approving, setApproving] = useState(false);

  // Reject dialog state
  const [rejectTarget, setRejectTarget] = useState<Application | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    if (tab === "applications") fetchApplications();
  }, [tab, statusFilter]);

  async function fetchConfig() {
    const res = await fetch("/api/admin/beta/config");
    if (!res.ok) return;
    const data = await res.json();
    setConfig(data.config);
    setStats(data.stats);
  }

  async function fetchApplications() {
    setLoadingApps(true);
    const res = await fetch(`/api/admin/beta/applications?status=${statusFilter}`);
    if (res.ok) {
      const data = await res.json();
      setApplications(data.applications);
    }
    setLoadingApps(false);
  }

  async function toggleBetaMode() {
    if (!config) return;
    setSaving(true);
    const newValue = !config.betaModeEnabled;
    const res = await fetch("/api/admin/beta/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ betaModeEnabled: newValue }),
    });
    if (res.ok) {
      const data = await res.json();
      setConfig(data.config);
      toast.success(newValue ? "Beta Mode ativado" : "Beta Mode desativado");
    } else {
      toast.error("Erro ao atualizar configuração");
    }
    setSaving(false);
  }

  async function handleApprove() {
    if (!approveTarget || approvePassword.length < 8) return;
    setApproving(true);
    const res = await fetch(`/api/admin/beta/applications/${approveTarget.id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: approvePassword }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success(`${approveTarget.email} aprovado — email enviado`);
      setApproveTarget(null);
      setApprovePassword("");
      fetchApplications();
      fetchConfig();
    } else {
      toast.error(data.error ?? "Erro ao aprovar");
    }
    setApproving(false);
  }

  async function handleReject() {
    if (!rejectTarget) return;
    setRejecting(true);
    const res = await fetch(`/api/admin/beta/applications/${rejectTarget.id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: rejectNotes }),
    });
    if (res.ok) {
      toast.success(`${rejectTarget.email} rejeitado`);
      setRejectTarget(null);
      setRejectNotes("");
      fetchApplications();
      fetchConfig();
    } else {
      toast.error("Erro ao rejeitar");
    }
    setRejecting(false);
  }

  const statusBadge = (status: string) => {
    if (status === "APPROVED") return <Badge variant="default">Aprovado</Badge>;
    if (status === "REJECTED") return <Badge variant="destructive">Rejeitado</Badge>;
    return <Badge variant="outline">Pendente</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Beta Mode</h1>
        <p className="text-muted-foreground text-sm">Gestão de candidaturas e acesso à beta fechada</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["config", "applications"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === t ? "btn-gradient text-white" : "glass-sm text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "config" ? "Configuração" : `Candidaturas (${stats.total})`}
          </button>
        ))}
      </div>

      {/* Config Tab */}
      {tab === "config" && (
        <div className="space-y-4">
          <Card variant="glass">
            <CardHeader>
              <CardTitle>Estado do Beta Mode</CardTitle>
              <CardDescription>
                Quando ativo, a landing page mostra o formulário de candidatura e /register fica bloqueado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Beta Mode</p>
                  <p className="text-sm text-muted-foreground">
                    {config?.betaModeEnabled ? "Ativo — registo bloqueado" : "Inativo — registo normal"}
                  </p>
                </div>
                <Button
                  onClick={toggleBetaMode}
                  disabled={saving || !config}
                  variant={config?.betaModeEnabled ? "destructive" : "default"}
                >
                  {saving ? "A guardar..." : config?.betaModeEnabled ? "Desativar" : "Ativar"}
                </Button>
              </div>

              {config?.betaModeEnabled && (
                <div className="flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    A página /register está bloqueada. Apenas utilizadores aprovados na beta podem aceder.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              { label: "Total", value: stats.total, Icon: Users, color: "text-foreground" },
              { label: "Pendentes", value: stats.pending, Icon: Clock, color: "text-amber-600" },
              { label: "Aprovados", value: stats.approved, Icon: CheckCircle, color: "text-primary" },
              { label: "Rejeitados", value: stats.rejected, Icon: XCircle, color: "text-destructive" },
            ].map(({ label, value, Icon, color }) => (
              <Card key={label} variant="glass">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={14} className={color} />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                  <p className="text-2xl font-bold">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Applications Tab */}
      {tab === "applications" && (
        <div className="space-y-4">
          {/* Status filter */}
          <div className="flex gap-2 flex-wrap">
            {["PENDING", "APPROVED", "REJECTED", "ALL"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? "btn-gradient text-white"
                    : "glass-sm text-muted-foreground hover:text-foreground"
                }`}
              >
                {s === "PENDING" ? `Pendentes (${stats.pending})` :
                 s === "APPROVED" ? `Aprovados (${stats.approved})` :
                 s === "REJECTED" ? `Rejeitados (${stats.rejected})` :
                 `Todos (${stats.total})`}
              </button>
            ))}
          </div>

          {loadingApps ? (
            <p className="text-sm text-muted-foreground">A carregar...</p>
          ) : applications.length === 0 ? (
            <Card variant="glass">
              <CardContent className="py-10 text-center text-muted-foreground text-sm">
                Nenhuma candidatura encontrada.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => (
                <Card key={app.id} variant="glass">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{app.email}</span>
                          {statusBadge(app.status)}
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>{STUDY_LEVEL_LABELS[app.studyLevel] ?? app.studyLevel}</span>
                          <span>·</span>
                          <span>{FEEDBACK_LABELS[app.feedbackCommitment] ?? app.feedbackCommitment}</span>
                          <span>·</span>
                          <span>{new Date(app.createdAt).toLocaleDateString("pt-PT")}</span>
                        </div>
                        <p className="text-xs text-muted-foreground italic truncate">{app.disciplines}</p>
                      </div>
                      {app.status === "PENDING" && (
                        <div className="flex gap-2 shrink-0">
                          <Button
                            size="sm"
                            onClick={() => { setApproveTarget(app); setApprovePassword(""); }}
                          >
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setRejectTarget(app); setRejectNotes(""); }}
                          >
                            Rejeitar
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Approve dialog */}
      <Dialog open={!!approveTarget} onOpenChange={(v) => !v && setApproveTarget(null)}>
        <DialogContent className="glass border-0 rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Aprovar candidatura</DialogTitle>
            <DialogDescription>
              Define a palavra-passe de acesso para <strong>{approveTarget?.email}</strong>.
              Será enviada por email ao utilizador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="approve-password">Palavra-passe (mín. 8 caracteres)</Label>
              <Input
                id="approve-password"
                type="text"
                value={approvePassword}
                onChange={(e) => setApprovePassword(e.target.value)}
                placeholder="Palavra-passe temporária"
                autoComplete="off"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="glass" onClick={() => setApproveTarget(null)}>Cancelar</Button>
              <Button
                onClick={handleApprove}
                disabled={approving || approvePassword.length < 8}
              >
                {approving ? "A aprovar..." : "Aprovar e enviar email"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(v) => !v && setRejectTarget(null)}>
        <DialogContent className="glass border-0 rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Rejeitar candidatura</DialogTitle>
            <DialogDescription>
              Rejeitar <strong>{rejectTarget?.email}</strong>? Podes adicionar notas internas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="reject-notes">Notas (opcional)</Label>
              <Textarea
                id="reject-notes"
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="Motivo ou observações internas..."
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="glass" onClick={() => setRejectTarget(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleReject} disabled={rejecting}>
                {rejecting ? "A rejeitar..." : "Rejeitar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
