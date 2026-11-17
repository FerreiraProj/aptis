"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
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
import { UpgradeDialog } from "@/components/upgrade-dialog";
import { toast } from "sonner";

interface UserProfile {
  fullName: string | null;
  examDate: string | null;
  hoursPerDay: number | null;
  gradeGoal: string | null;
  preferredExplanationStyle: string;
  studyNiche: string | null;
  currentLevel: string | null;
  subscription?: {
    plan: string;
    status: string;
    currentPeriodEnd: string;
  } | null;
  effectivePlan?: string;
  planOverrideActive?: boolean;
  planOverrideExpiresAt?: string | null;
}

type TabId = "geral" | "estudo" | "ia";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("geral");

  const NICHES = [
    { value: "medicine", label: t("niches.medicine") },
    { value: "nursing", label: t("niches.nursing") },
    { value: "law", label: t("niches.law") },
    { value: "engineering", label: t("niches.engineering") },
    { value: "pharmacy", label: t("niches.pharmacy") },
    { value: "dentistry", label: t("niches.dentistry") },
    { value: "psychology", label: t("niches.psychology") },
    { value: "biology", label: t("niches.biology") },
    { value: "sociology", label: t("niches.sociology") },
    { value: "geography", label: t("niches.geography") },
    { value: "sports", label: t("niches.sports") },
    { value: "other", label: t("niches.other") },
  ];

  const LEVELS = [
    { value: "beginner", label: t("levels.beginner"), description: t("levels.beginnerDesc") },
    { value: "intermediate", label: t("levels.intermediate"), description: t("levels.intermediateDesc") },
    { value: "advanced", label: t("levels.advanced"), description: t("levels.advancedDesc") },
  ];

  const EXPLANATION_STYLES = [
    { value: "CONCISE", label: t("explanationStyles.concise"), description: t("explanationStyles.conciseDesc") },
    { value: "DETAILED", label: t("explanationStyles.detailed"), description: t("explanationStyles.detailedDesc") },
    { value: "ANALOGICAL", label: t("explanationStyles.analogical"), description: t("explanationStyles.analogicalDesc") },
    { value: "VISUAL", label: t("explanationStyles.visual"), description: t("explanationStyles.visualDesc") },
  ];

  const TABS: { id: TabId; label: string }[] = [
    { id: "geral", label: t("tabGeneral") },
    { id: "estudo", label: t("tabStudy") },
    { id: "ia", label: t("tabAI") },
  ];

  useEffect(() => {
    fetchProfile();
    if (searchParams.get("checkout") === "canceled") {
      toast.info(t("checkoutCanceled"));
      router.replace("/settings");
    }
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
        studyNiche: profile.studyNiche,
        currentLevel: profile.currentLevel,
      }),
    });

    if (res.ok) {
      toast.success(t("saved"));
    } else {
      toast.error(t("saveError"));
    }
    setSaving(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleSyncSubscription() {
    setSyncing(true);
    try {
      const res = await fetch("/api/stripe/sync-now", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        if (data.subscription) {
          toast.success(t("syncSuccess", { plan: data.subscription.plan }));
        } else {
          toast.info(t("syncNoSubscription"));
        }
        await fetchProfile();
      } else {
        toast.error(t("syncError"));
      }
    } catch {
      toast.error(t("syncError"));
    }
    setSyncing(false);
  }

  async function handleManageBilling() {
    const res = await fetch("/api/stripe/create-portal", { method: "POST" });
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    } else {
      toast.error(t("billingPortalError"));
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <p className="text-muted-foreground">{t("loading" as Parameters<typeof t>[0])}</p>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 glass-sm rounded-xl p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "btn-gradient text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: General ─────────────────────────────────────────────────── */}
      {activeTab === "geral" && (
        <div className="space-y-4">
          <form onSubmit={handleSave} className="space-y-4">
            <Card variant="glass">
              <CardHeader>
                <CardTitle>{t("profileTitle")}</CardTitle>
                <CardDescription>{t("profileDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">{t("fullName")}</Label>
                  <Input
                    id="fullName"
                    value={profile.fullName ?? ""}
                    onChange={(e) =>
                      setProfile({ ...profile, fullName: e.target.value })
                    }
                    placeholder={t("yourName")}
                  />
                </div>
              </CardContent>
            </Card>

            <Button type="submit" disabled={saving}>
              {saving ? t("saving" as Parameters<typeof t>[0]) : t("save" as Parameters<typeof t>[0])}
            </Button>
          </form>

          {/* Billing */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle>{t("billingTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {t("planLabel", {
                      plan: profile.effectivePlan ?? profile.subscription?.plan ?? "FREE",
                    })}
                  </p>
                  {profile.planOverrideActive ? (
                    <p className="text-sm text-muted-foreground">
                      {profile.planOverrideExpiresAt
                        ? `${t("grantedUntil")} ${new Date(
                            profile.planOverrideExpiresAt
                          ).toLocaleDateString()}`
                        : t("grantedIndefinite")}
                    </p>
                  ) : profile.subscription?.currentPeriodEnd && (
                    <p className="text-sm text-muted-foreground">
                      {t("renewsOn")}{" "}
                      {new Date(
                        profile.subscription.currentPeriodEnd
                      ).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <Badge
                  variant={
                    profile.planOverrideActive || profile.subscription?.status === "ACTIVE"
                      ? "default"
                      : "outline"
                  }
                >
                  {profile.planOverrideActive
                    ? "ACTIVE"
                    : profile.subscription?.status ?? "FREE"}
                </Badge>
              </div>
              {!profile.subscription ? (
                <div className="flex flex-col gap-2">
                  <Button className="w-full" onClick={() => setUpgradeOpen(true)}>
                    {t("upgrade")}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-xs text-muted-foreground"
                    onClick={handleSyncSubscription}
                    disabled={syncing}
                  >
                    {syncing ? t("syncing") : t("syncSubscription")}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button className="flex-1" onClick={() => setUpgradeOpen(true)}>
                    {t("changePlan")}
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={handleManageBilling}>
                    {t("manageBilling")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sign out */}
          <Card variant="glass">
            <CardContent className="py-4">
              <Button
                variant="ghost"
                className="w-full text-destructive hover:text-destructive"
                onClick={handleSignOut}
              >
                {t("signOut")}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Tab: Study ────────────────────────────────────────────────── */}
      {activeTab === "estudo" && (
        <form onSubmit={handleSave} className="space-y-4">
          <Card variant="glass">
            <CardHeader>
              <CardTitle>{t("studyArea")}</CardTitle>
              <CardDescription>
                {t("studyAreaDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t("area")}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {NICHES.map((n) => (
                    <button
                      key={n.value}
                      type="button"
                      onClick={() =>
                        setProfile({ ...profile, studyNiche: n.value })
                      }
                      className={`rounded-xl border px-2 py-2.5 text-center text-sm transition-all ${
                        profile.studyNiche === n.value
                          ? "border-primary bg-primary/10 ring-1 ring-primary/30 font-medium"
                          : "border-border/50 hover:bg-accent/60"
                      }`}
                    >
                      {n.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("currentLevel")}</Label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {LEVELS.map((level) => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() =>
                        setProfile({ ...profile, currentLevel: level.value })
                      }
                      className={`rounded-xl border p-3 text-left transition-all ${
                        profile.currentLevel === level.value
                          ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                          : "border-border/50 hover:bg-accent/60"
                      }`}
                    >
                      <p className="font-medium text-sm">{level.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {level.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle>{t("studyPrefs")}</CardTitle>
              <CardDescription>
                {t("studyPrefsDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="examDate">{t("examDateLabel")}</Label>
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
                <Label htmlFor="hoursPerDay">{t("hoursPerDayLabel")}</Label>
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
                  placeholder={t("hoursPlaceholder")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gradeGoal">{t("gradeGoalLabel")}</Label>
                <Input
                  id="gradeGoal"
                  value={profile.gradeGoal ?? ""}
                  onChange={(e) =>
                    setProfile({ ...profile, gradeGoal: e.target.value || null })
                  }
                  placeholder={t("gradeGoalPlaceholder")}
                />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" disabled={saving}>
            {saving ? t("saving" as Parameters<typeof t>[0]) : t("save" as Parameters<typeof t>[0])}
          </Button>
        </form>
      )}

      {/* ── Tab: AI ───────────────────────────────────────────────── */}
      {activeTab === "ia" && (
        <form onSubmit={handleSave} className="space-y-4">
          <Card variant="glass">
            <CardHeader>
              <CardTitle>{t("aiStyle")}</CardTitle>
              <CardDescription>
                {t("aiStyleDesc")}
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
                    className={`rounded-xl border p-3 text-left transition-all ${
                      profile.preferredExplanationStyle === style.value
                        ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                        : "border-border/50 hover:bg-accent/60"
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
            {saving ? t("saving" as Parameters<typeof t>[0]) : t("save" as Parameters<typeof t>[0])}
          </Button>
        </form>
      )}

      <UpgradeDialog open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </div>
  );
}
