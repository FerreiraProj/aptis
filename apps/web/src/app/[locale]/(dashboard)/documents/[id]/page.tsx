"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Target, XCircle, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  GenerateDialog,
  type GenerateMode,
  type GenerateOptions,
} from "@/components/quizzes/generate-dialog";

interface DocumentDetail {
  id: string;
  title: string;
  status: string;
  sourceType: string;
  wordCount: number | null;
  pageCount: number | null;
  createdAt: string;
  errorMessage: string | null;
  _count: { flashcards: number; quizzes: number; chunks: number };
}

type GenerationLimits = { maxQuestions: number; maxFlashcards: number };

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const locale = useLocale();
  const tGen = useTranslations("generate");
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [limits, setLimits] = useState<GenerationLimits>({ maxQuestions: 10, maxFlashcards: 20 });
  const [dialogMode, setDialogMode] = useState<GenerateMode | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocument();
    // Poll while processing
    const interval = setInterval(() => {
      if (doc?.status === "PROCESSING" || doc?.status === "PENDING") {
        fetchDocument();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [doc?.status]);

  async function fetchDocument() {
    const res = await fetch(`/api/documents/${id}`);
    if (!res.ok) {
      router.push("/documents");
      return;
    }
    const data = await res.json();
    setDoc(data.document);
    if (data.generationLimits) setLimits(data.generationLimits);
    setLoading(false);
  }

  async function handleGenerate(options: GenerateOptions) {
    setGenerating(true);
    try {
      const body =
        options.mode === "quiz"
          ? {
              type: "quiz",
              count: options.count,
              quizType: options.quizType,
              difficulty: options.difficulty,
              locale,
            }
          : { type: "flashcards", count: options.count, locale };

      const res = await fetch(`/api/documents/${id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || tGen("error"));
      }

      const { results } = await res.json();
      toast.success(
        options.mode === "flashcards"
          ? tGen("successFlashcards", { count: results?.flashcards ?? options.count })
          : tGen("successQuiz", { count: results?.questions ?? options.count })
      );
      setDialogMode(null);

      if (options.mode === "flashcards") router.push("/flashcards");
      else if (results?.quiz) router.push(`/quizzes/${results.quiz}`);
      else router.push("/quizzes");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tGen("error"));
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Tens a certeza que queres eliminar este documento?")) return;

    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Documento eliminado");
      router.push("/documents");
    } else {
      toast.error("Erro ao eliminar documento");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">A carregar...</p>
        </div>
      </div>
    );
  }

  if (!doc) return null;

  const isReady = doc.status === "READY";
  const isProcessing =
    doc.status === "PROCESSING" || doc.status === "PENDING";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/documents"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Documentos
            </Link>
          </div>
          <h1 className="text-2xl font-bold truncate">{doc.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground">
              {sourceTypeLabel(doc.sourceType)}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-sm text-muted-foreground">
              {new Date(doc.createdAt).toLocaleDateString("pt-PT")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={doc.status} />
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={handleDelete}
          >
            Eliminar
          </Button>
        </div>
      </div>

      {/* Processing indicator */}
      {isProcessing && (
        <Card variant="glass">
          <CardContent className="py-6">
            <div className="space-y-3 text-center">
              <Loader2 size={28} className="mx-auto animate-spin text-primary" />
              <p className="font-medium">A processar o documento...</p>
              <p className="text-sm text-muted-foreground">
                A extrair texto e a gerar embeddings. O ficheiro é eliminado
                após extração.
              </p>
              <Progress value={undefined} className="animate-pulse" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {isReady && (
        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard label="Palavras" value={doc.wordCount?.toLocaleString() ?? "—"} />
          <StatCard label="Páginas" value={doc.pageCount?.toString() ?? "—"} />
          <StatCard label="Flashcards" value={doc._count.flashcards.toString()} />
          <StatCard label="Quizzes" value={doc._count.quizzes.toString()} />
        </div>
      )}

      {/* Generate content */}
      {isReady && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap size={18} className="text-primary" /> Flashcards
              </CardTitle>
              <CardDescription>
                Gera flashcards com repetição espaçada (SM-2) a partir deste
                documento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {doc._count.flashcards > 0 && (
                <p className="text-sm text-muted-foreground">
                  {doc._count.flashcards} flashcards já gerados
                </p>
              )}
              <Button
                className="w-full"
                onClick={() => setDialogMode("flashcards")}
                disabled={generating}
              >
                {tGen("flashcardsTitle")}
              </Button>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target size={18} className="text-primary" /> Quiz
              </CardTitle>
              <CardDescription>
                Escolha múltipla, várias corretas, verdadeiro/falso ou resposta
                aberta corrigida pela IA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {doc._count.quizzes > 0 && (
                <p className="text-sm text-muted-foreground">
                  {doc._count.quizzes} quiz{doc._count.quizzes !== 1 ? "zes" : ""} já gerado{doc._count.quizzes !== 1 ? "s" : ""}
                </p>
              )}
              <Button
                className="w-full"
                variant="outline"
                onClick={() => setDialogMode("quiz")}
                disabled={generating}
              >
                {tGen("quizTitle")}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {dialogMode && (
        <GenerateDialog
          open
          onOpenChange={(open) => !open && setDialogMode(null)}
          mode={dialogMode}
          max={dialogMode === "quiz" ? limits.maxQuestions : limits.maxFlashcards}
          generating={generating}
          onGenerate={handleGenerate}
        />
      )}

      {/* Failed state */}
      {doc.status === "FAILED" && (
        <Card variant="glass" className="border-destructive/50">
          <CardContent className="py-6 text-center">
            <XCircle size={32} className="mx-auto text-destructive" />
            <p className="mt-2 font-medium text-destructive">
              Falha ao processar o documento
            </p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              {doc.errorMessage ?? "Tenta de novo ou carrega um ficheiro diferente"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card variant="glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
  > = {
    PENDING: { label: "Pendente", variant: "outline" },
    PROCESSING: { label: "A processar", variant: "secondary" },
    READY: { label: "Pronto", variant: "default" },
    FAILED: { label: "Erro", variant: "destructive" },
  };
  const c = config[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

function sourceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    PDF: "PDF",
    POWERPOINT: "PowerPoint",
    TEXT: "Texto",
    YOUTUBE: "YouTube",
    SCREENSHOT: "Imagem",
    IMAGE: "Imagem",
  };
  return labels[type] ?? type;
}
