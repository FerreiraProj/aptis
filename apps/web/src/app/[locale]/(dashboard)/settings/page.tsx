"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
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

interface UserProfile {
  fullName: string | null;
  examDate: string | null;
  hoursPerDay: number | null;
  gradeGoal: string | null;
  preferredExplanationStyle: string;
  subscription?: {
    plan: string;
    status: string;
    currentPeriodEnd: string;
  } | null;
}

const EXPLANATION_STYLES = [
  { value: "CONCISE", label: "Conciso", description: "Respostas curtas e diretas" },
  { value: "DETAILED", label: "Detalhado", description: "Explicações aprofundadas" },
  { value: "ANALOGICAL", label: "Por analogia", description: "Usa exemplos e comparações" },
  { value: "VISUAL", label: "Visual", description: "Estruturado com listas e diagramas" },
];

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    const res = await fetch("/api/user/profile");
    if (res.ok) {
      const data = await res.json();
      setProfile(data.user);
    }
    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);

    const res = await fetch("/api/user/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: profile.fullName,
        examDate: profile.examDate,
        hoursPerDay: profile.hoursPerDay,
        gradeGoal: profile.gradeGoal,
        preferredExplanationStyle: profile.preferredExplanationStyle,
      }),
    });

    if (res.ok) {
      toast.success("Definições guardadas");
    } else {
      toast.error("Erro ao guardar definições");
    }
    setSaving(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleManageBilling() {
    const res = await fetch("/api/stripe/create-portal", { method: "POST" });
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    } else {
      toast.error("Erro ao abrir portal de faturação");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <p className="text-muted-foreground">A carregar...</p>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Definições</h1>
        <p className="text-muted-foreground">Gere o teu perfil e preferências</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome completo</Label>
              <Input
                id="fullName"
                value={profile.fullName ?? ""}
                onChange={(e) =>
                  setProfile({ ...profile, fullName: e.target.value })
                }
                placeholder="O teu nome"
              />
            </div>
          </CardContent>
        </Card>

        {/* Study preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Preferências de estudo</CardTitle>
            <CardDescription>
              Usamos estes dados para personalizar o teu plano de estudo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="examDate">Data do exame</Label>
              <Input
                id="examDate"
                type="date"
                value={
                  profile.examDate
                    ? new Date(profile.examDate).toISOString().split("T")[0]
                    : ""
                }
                onChange={(e) =>
                  setProfile({ ...profile, examDate: e.target.value || null })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hoursPerDay">Horas de estudo por dia</Label>
              <Input
                id="hoursPerDay"
                type="number"
                min="0.5"
                max="16"
                step="0.5"
                value={profile.hoursPerDay ?? ""}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    hoursPerDay: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                placeholder="Ex: 3"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gradeGoal">Nota objetivo</Label>
              <Input
                id="gradeGoal"
                value={profile.gradeGoal ?? ""}
                onChange={(e) =>
                  setProfile({ ...profile, gradeGoal: e.target.value || null })
                }
                placeholder="Ex: 16, 85%, Aprovado"
              />
            </div>
          </CardContent>
        </Card>

        {/* Explanation style */}
        <Card>
          <CardHeader>
            <CardTitle>Estilo de explicação</CardTitle>
            <CardDescription>
              Como preferes que o tutor IA explique conceitos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {EXPLANATION_STYLES.map((style) => (
                <button
                  key={style.value}
                  type="button"
                  onClick={() =>
                    setProfile({
                      ...profile,
                      preferredExplanationStyle: style.value,
                    })
                  }
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    profile.preferredExplanationStyle === style.value
                      ? "border-primary bg-primary/5"
                      : "hover:bg-accent"
                  }`}
                >
                  <p className="font-medium text-sm">{style.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {style.description}
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={saving}>
          {saving ? "A guardar..." : "Guardar definições"}
        </Button>
      </form>

      {/* Billing */}
      <Card>
        <CardHeader>
          <CardTitle>Plano e faturação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                Plano {profile.subscription?.plan ?? "FREE"}
              </p>
              {profile.subscription?.currentPeriodEnd && (
                <p className="text-sm text-muted-foreground">
                  Renova em{" "}
                  {new Date(
                    profile.subscription.currentPeriodEnd
                  ).toLocaleDateString("pt-PT")}
                </p>
              )}
            </div>
            <Badge
              variant={
                profile.subscription?.status === "ACTIVE" ? "default" : "outline"
              }
            >
              {profile.subscription?.status ?? "FREE"}
            </Badge>
          </div>
          {!profile.subscription ? (
            <Button className="w-full" onClick={() => router.push("/#pricing")}>
              Fazer upgrade
            </Button>
          ) : (
            <Button variant="outline" className="w-full" onClick={handleManageBilling}>
              Gerir faturação
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Sign out */}
      <Card>
        <CardContent className="py-4">
          <Button
            variant="ghost"
            className="w-full text-destructive hover:text-destructive"
            onClick={handleSignOut}
          >
            Terminar sessão
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
