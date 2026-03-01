"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, Check, Gift } from "lucide-react";

interface HistoryItem {
  id: string;
  email: string;
  signedUpAt: string;
  convertedAt: string | null;
}

interface Translations {
  title: string;
  description: string;
  yourLink: string;
  copy: string;
  copied: string;
  shareWhatsApp: string;
  shareEmail: string;
  applyMonths: string;
  applied: string;
  statsReferrals: string;
  statsConverted: string;
  statsEarned: string;
  statsApplied: string;
  historyTitle: string;
  statusSignedUp: string;
  statusPaid: string;
}

interface Props {
  code: string;
  pendingMonths: number;
  appliedMonths: number;
  totalReferrals: number;
  converted: number;
  history: HistoryItem[];
  appUrl: string;
  t: Translations;
}

export function ReferralClient({
  code,
  pendingMonths,
  appliedMonths,
  totalReferrals,
  converted,
  history,
  appUrl,
  t,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [applying, setApplying] = useState(false);
  const [currentPending, setCurrentPending] = useState(pendingMonths);

  const referralUrl = `${appUrl}?ref=${code}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleApply() {
    setApplying(true);
    const res = await fetch("/api/referral/apply", { method: "POST" });
    setApplying(false);
    if (res.ok) {
      toast.success(t.applied);
      setCurrentPending(0);
    } else {
      toast.error("Erro ao aplicar desconto");
    }
  }

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    `Estou a usar o Aptis para estudar. Usa o meu link para ganhares um desconto: ${referralUrl}`
  )}`;
  const mailtoUrl = `mailto:?subject=${encodeURIComponent("Experimenta o Aptis!")}&body=${encodeURIComponent(
    `Olá! Estou a usar o Aptis para estudar. Usa o meu link de convite para começares: ${referralUrl}`
  )}`;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
          <Gift size={22} />
          {t.title}
        </h1>
        <p className="text-muted-foreground mt-1">{t.description}</p>
      </div>

      {/* Referral link */}
      <Card className="glass-sm">
        <CardHeader>
          <CardTitle className="text-base">{t.yourLink}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 text-sm font-mono break-all">
            <span className="flex-1">{referralUrl}</span>
            <button onClick={handleCopy} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
              {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={handleCopy} variant="outline">
              {copied ? t.copied : t.copy}
            </Button>
            <Button size="sm" asChild variant="outline">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                {t.shareWhatsApp}
              </a>
            </Button>
            <Button size="sm" asChild variant="outline">
              <a href={mailtoUrl}>
                {t.shareEmail}
              </a>
            </Button>
          </div>

          {currentPending > 0 && (
            <Button
              onClick={handleApply}
              disabled={applying}
              className="btn-gradient w-full"
            >
              {applying ? "…" : t.applyMonths}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(
          [
            [t.statsReferrals, totalReferrals],
            [t.statsConverted, converted],
            [t.statsEarned, pendingMonths + appliedMonths],
            [t.statsApplied, appliedMonths],
          ] as const
        ).map(([label, value]) => (
          <Card key={label} className="glass-sm">
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold gradient-text">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* History */}
      {history.length > 0 && (
        <Card className="glass-sm">
          <CardHeader>
            <CardTitle className="text-base">{t.historyTitle}</CardTitle>
            <CardDescription>{history.length} entradas</CardDescription>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Email</th>
                  <th className="text-left py-2">Data</th>
                  <th className="text-left py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b last:border-0">
                    <td className="py-2 font-mono text-xs">{h.email}</td>
                    <td className="py-2 text-muted-foreground">
                      {new Date(h.signedUpAt).toLocaleDateString()}
                    </td>
                    <td className="py-2">
                      <Badge variant={h.convertedAt ? "default" : "secondary"}>
                        {h.convertedAt ? t.statusPaid : t.statusSignedUp}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
