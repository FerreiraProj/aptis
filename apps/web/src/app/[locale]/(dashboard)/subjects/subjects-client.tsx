"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UpgradeDialog } from "@/components/upgrade-dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, BookMarked, FileText } from "lucide-react";
import type { PlanKey } from "@/lib/constants";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Subject {
  id: string;
  name: string;
  emoji: string;
  color: string;
  description: string | null;
  documentCount: number;
}

interface SubjectsClientProps {
  initialSubjects: Subject[];
  plan: PlanKey;
  limit: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESET_EMOJIS = ["📚", "🧬", "⚕️", "⚖️", "🔬", "💊", "🧠", "📐", "🌍", "🎵"];
const PRESET_COLORS = [
  "#0ea5e9", // sky
  "#14b8a6", // teal
  "#8b5cf6", // purple
  "#f59e0b", // amber
  "#f43f5e", // rose
  "#22c55e", // green
];

// ─── Component ────────────────────────────────────────────────────────────────

export function SubjectsClient({ initialSubjects, plan, limit }: SubjectsClientProps) {
  const t = useTranslations("subjects");
  const tCommon = useTranslations("common");
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📚");
  const [color, setColor] = useState("#0ea5e9");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const atLimit = subjects.length >= limit;
  const isInfinite = limit === Infinity;

  const planLabel = t(`planLabels.${plan}`);

  function openCreate() {
    if (atLimit) {
      setUpgradeOpen(true);
      return;
    }
    setEditingId(null);
    setName("");
    setEmoji("📚");
    setColor("#0ea5e9");
    setDescription("");
    setFormOpen(true);
  }

  function openEdit(s: Subject) {
    setEditingId(s.id);
    setName(s.name);
    setEmoji(s.emoji);
    setColor(s.color);
    setDescription(s.description ?? "");
    setFormOpen(true);
  }

  function cancelForm() {
    setFormOpen(false);
    setEditingId(null);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error(t("nameRequired"));
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch(`/api/subjects/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), emoji, color, description: description.trim() || null }),
        });
        if (!res.ok) throw new Error(await res.text());
        const { subject } = await res.json();
        setSubjects((prev) =>
          prev.map((s) =>
            s.id === editingId
              ? { ...s, name: subject.name, emoji: subject.emoji, color: subject.color, description: subject.description }
              : s
          )
        );
        toast.success(t("updated"));
      } else {
        const res = await fetch("/api/subjects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), emoji, color, description: description.trim() || null }),
        });
        if (res.status === 403) {
          setUpgradeOpen(true);
          return;
        }
        if (!res.ok) throw new Error(await res.text());
        const { subject } = await res.json();
        setSubjects((prev) => [...prev, { ...subject, documentCount: 0 }]);
        toast.success(t("created"));
      }
      cancelForm();
    } catch {
      toast.error(t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/subjects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setSubjects((prev) => prev.filter((s) => s.id !== id));
      toast.success(t("deleted"));
    } catch {
      toast.error(t("deleteError"));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isInfinite && (
            <span className="text-sm text-muted-foreground glass-sm rounded-full px-3 py-1">
              {t("limitBadge", { count: subjects.length, limit, plan: planLabel })}
            </span>
          )}
          <Button onClick={openCreate} disabled={!isInfinite && atLimit}>
            <Plus size={16} className="mr-1.5" />
            {t("createButton")}
          </Button>
        </div>
      </div>

      {/* ── Create / Edit form ────────────────────────────────────────────── */}
      {formOpen && (
        <Card variant="glass" className="p-5">
          <h2 className="font-semibold mb-4">
            {editingId ? t("formEdit") : t("formCreate")}
          </h2>
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="text-sm font-medium mb-1 block">{t("nameLabel")}</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("namePlaceholder")}
                maxLength={100}
                autoFocus
              />
            </div>

            {/* Emoji picker */}
            <div>
              <label className="text-sm font-medium mb-1 block">{t("emojiLabel")}</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    className={`h-9 w-9 rounded-xl text-lg flex items-center justify-center transition-colors ${
                      emoji === e
                        ? "bg-primary/20 ring-2 ring-primary"
                        : "hover:bg-accent/60"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Color picker */}
            <div>
              <label className="text-sm font-medium mb-1 block">{t("colorLabel")}</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{ backgroundColor: c }}
                    className={`h-8 w-8 rounded-lg transition-transform ${
                      color === c ? "scale-110 ring-2 ring-offset-2 ring-foreground/30" : "hover:scale-105"
                    }`}
                    aria-label={`${t("colorLabel")} ${c}`}
                  />
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium mb-1 block">{t("descriptionLabel")}</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("descriptionPlaceholder")}
                maxLength={200}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={cancelForm}>
                {tCommon("cancel")}
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving
                  ? tCommon("saving")
                  : editingId
                    ? t("saveChanges")
                    : t("createButton")}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ── Subject cards ────────────────────────────────────────────────── */}
      {subjects.length === 0 && !formOpen ? (
        <Card variant="glass" className="p-12 text-center">
          <BookMarked size={40} className="mx-auto mb-3 text-muted-foreground" />
          <p className="font-medium">{t("noSubjects")}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {t("noSubjectsDesc")}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s) => (
            <Card
              key={s.id}
              variant="glass"
              className="flex overflow-hidden hover:scale-[1.01] transition-transform"
              style={{ borderLeft: `4px solid ${s.color}` }}
            >
              <div className="flex-1 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{s.emoji}</span>
                    <div>
                      <p className="font-semibold leading-tight">{s.name}</p>
                      {s.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {s.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(s)}
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
                      aria-label={t("editAriaLabel")}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      disabled={deletingId === s.id}
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      aria-label={t("deleteAriaLabel")}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                  <FileText size={12} />
                  <span>
                    {s.documentCount === 1
                      ? t("documentCount")
                      : t("documentCountPlural", { count: s.documentCount })}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <UpgradeDialog open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </div>
  );
}
