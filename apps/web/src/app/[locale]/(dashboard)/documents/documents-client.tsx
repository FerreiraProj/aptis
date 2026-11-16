"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { FileText, BookMarked } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type Subject = {
  id: string;
  name: string;
  emoji: string;
  color: string;
};

type Doc = {
  id: string;
  title: string;
  status: string;
  sourceType: string;
  wordCount: number | null;
  pageCount: number | null;
  isArchived: boolean;
  subjectId: string | null;
  createdAt: Date;
  _count: { flashcards: number; quizzes: number };
  discipline: { name: string; color: string; emoji: string } | null;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function DocumentsClient({
  active,
  archived,
  subjects,
}: {
  active: Doc[];
  archived: Doc[];
  subjects: Subject[];
}) {
  const t = useTranslations("documents");
  const [activeDocs, setActiveDocs] = useState(active);
  const [archivedDocs, setArchivedDocs] = useState(archived);
  const [showArchived, setShowArchived] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null); // null = all

  async function toggleArchive(doc: Doc) {
    setTogglingId(doc.id);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: !doc.isArchived }),
      });
      if (!res.ok) throw new Error();
      if (!doc.isArchived) {
        setActiveDocs((prev) => prev.filter((d) => d.id !== doc.id));
        setArchivedDocs((prev) => [{ ...doc, isArchived: true }, ...prev]);
        toast.success(`"${doc.title}" ${t("archive")}`);
      } else {
        setArchivedDocs((prev) => prev.filter((d) => d.id !== doc.id));
        setActiveDocs((prev) => [{ ...doc, isArchived: false }, ...prev]);
        toast.success(`"${doc.title}" ${t("restore")}`);
      }
    } catch {
      toast.error(t("updateError"));
    } finally {
      setTogglingId(null);
    }
  }

  async function assignSubject(docId: string, subjectId: string | null) {
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId }),
      });
      if (!res.ok) throw new Error();
      const newDiscipline = subjects.find((s) => s.id === subjectId) ?? null;
      const update = (docs: Doc[]) =>
        docs.map((d) =>
          d.id === docId
            ? { ...d, subjectId, discipline: newDiscipline }
            : d
        );
      setActiveDocs(update);
      setArchivedDocs(update);
      toast.success(subjectId ? t("subjectAssigned") : t("subjectRemoved"));
    } catch {
      toast.error(t("subjectError"));
    }
  }

  // Filter active docs by selected subject
  const filteredActive =
    activeFilter === null
      ? activeDocs
      : activeFilter === "none"
        ? activeDocs.filter((d) => !d.subjectId)
        : activeDocs.filter((d) => d.subjectId === activeFilter);

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">
            {activeDocs.length === 1
              ? t("activeCount", { count: activeDocs.length })
              : t("activeCountPlural", { count: activeDocs.length })}
            {archivedDocs.length > 0 && (
              <>
                {" · "}
                {archivedDocs.length === 1
                  ? t("archivedCount", { count: archivedDocs.length })
                  : t("archivedCountPlural", { count: archivedDocs.length })}
              </>
            )}
          </p>
        </div>
        <Link href="/upload">
          <Button>{t("upload")}</Button>
        </Link>
      </div>

      {/* ── Subject filter tabs ───────────────────────────────────────────── */}
      {subjects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveFilter(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeFilter === null
                ? "bg-primary text-primary-foreground"
                : "glass-sm text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("filterAll")}
          </button>
          {subjects.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveFilter(activeFilter === s.id ? null : s.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                activeFilter === s.id
                  ? "text-white"
                  : "glass-sm text-muted-foreground hover:text-foreground"
              }`}
              style={activeFilter === s.id ? { backgroundColor: s.color } : {}}
            >
              <span>{s.emoji}</span>
              {s.name}
            </button>
          ))}
          <button
            onClick={() => setActiveFilter(activeFilter === "none" ? null : "none")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeFilter === "none"
                ? "bg-muted text-foreground"
                : "glass-sm text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("filterNoSubject")}
          </button>
        </div>
      )}

      {/* ── Active documents ─────────────────────────────────────────────── */}
      {filteredActive.length === 0 ? (
        <Card variant="glass" className="border-dashed border-primary/30">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <FileText size={28} className="text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{t("noActive")}</h3>
              <p className="text-sm text-muted-foreground">
                {activeFilter ? t("noActiveFilter") : t("noActiveDesc")}
              </p>
            </div>
            {!activeFilter && (
              <Link href="/upload">
                <Button>{t("uploadDocument")}</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredActive.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              subjects={subjects}
              onArchive={() => toggleArchive(doc)}
              onAssignSubject={assignSubject}
              toggling={togglingId === doc.id}
            />
          ))}
        </div>
      )}

      {/* ── Archived documents section ───────────────────────────────────── */}
      {archivedDocs.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowArchived((v) => !v)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>{showArchived ? "▾" : "▸"}</span>
            {t("archived", { count: archivedDocs.length })}
          </button>

          {showArchived && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 opacity-70">
              {archivedDocs.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  subjects={subjects}
                  onArchive={() => toggleArchive(doc)}
                  onAssignSubject={assignSubject}
                  toggling={togglingId === doc.id}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Document Card ────────────────────────────────────────────────────────────

function DocumentCard({
  doc,
  subjects,
  onArchive,
  onAssignSubject,
  toggling,
}: {
  doc: Doc;
  subjects: Subject[];
  onArchive: () => void;
  onAssignSubject: (docId: string, subjectId: string | null) => void;
  toggling: boolean;
}) {
  const t = useTranslations("documents");
  const tCommon = useTranslations("common");
  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false);

  const sourceTypes: Record<string, string> = {
    PDF: "PDF",
    POWERPOINT: "PowerPoint",
    WORD: "Word",
    TEXT: t("sourceText"),
    YOUTUBE: "YouTube",
    SCREENSHOT: t("sourceImage"),
    IMAGE: t("sourceImage"),
  };

  return (
    <Card variant="glass" className={`h-full transition-transform ${!doc.isArchived ? "hover:scale-[1.01]" : ""}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/documents/${doc.id}`}
            className="flex-1 min-w-0"
            onClick={(e) => toggling && e.preventDefault()}
          >
            <CardTitle className="text-base truncate">{doc.title}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {sourceTypes[doc.sourceType] ?? doc.sourceType} ·{" "}
              {new Date(doc.createdAt).toLocaleDateString()}
            </p>
          </Link>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <StatusBadge status={doc.status} />
            {doc.isArchived && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                {t("archivedBadge")}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Discipline badge / quick-assign */}
        {doc.discipline ? (
          <button
            onClick={() => setSubjectPickerOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white mb-2"
            style={{ backgroundColor: doc.discipline.color }}
          >
            <span>{doc.discipline.emoji}</span>
            {doc.discipline.name}
          </button>
        ) : subjects.length > 0 ? (
          <button
            onClick={() => setSubjectPickerOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-muted-foreground glass-sm mb-2 hover:text-foreground transition-colors"
          >
            <BookMarked size={11} />
            {t("assignSubject")}
          </button>
        ) : null}

        {/* Inline subject picker */}
        {subjectPickerOpen && (
          <div className="mb-2 flex flex-wrap gap-1.5 p-2 rounded-xl glass-sm">
            {subjects.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  onAssignSubject(doc.id, doc.subjectId === s.id ? null : s.id);
                  setSubjectPickerOpen(false);
                }}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                  doc.subjectId === s.id
                    ? "text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                style={doc.subjectId === s.id ? { backgroundColor: s.color } : {}}
              >
                {s.emoji} {s.name}
              </button>
            ))}
            {doc.subjectId && (
              <button
                onClick={() => {
                  onAssignSubject(doc.id, null);
                  setSubjectPickerOpen(false);
                }}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-destructive hover:bg-destructive/10 transition-colors"
              >
                {t("removeSubject")}
              </button>
            )}
          </div>
        )}

        <div className="flex gap-4 text-xs text-muted-foreground">
          {doc.wordCount && (
            <span>{doc.wordCount.toLocaleString()} {tCommon("words")}</span>
          )}
          {doc.pageCount && <span>{doc.pageCount} {tCommon("pages")}</span>}
        </div>

        {doc.status === "READY" && (
          <div className="mt-3 flex gap-2">
            <Badge variant="outline" className="text-xs">
              {doc._count.flashcards} flashcards
            </Badge>
            <Badge variant="outline" className="text-xs">
              {doc._count.quizzes} quizzes
            </Badge>
          </div>
        )}

        <div className="mt-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onArchive();
            }}
            disabled={toggling}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            {toggling
              ? t("updating")
              : doc.isArchived
                ? t("restore")
                : t("archive")}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("documents");
  const config: Record<
    string,
    { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
  > = {
    PENDING: { label: t("statusPending"), variant: "outline" },
    PROCESSING: { label: t("statusProcessing"), variant: "secondary" },
    READY: { label: t("statusReady"), variant: "default" },
    FAILED: { label: t("statusFailed"), variant: "destructive" },
  };
  const c = config[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}
