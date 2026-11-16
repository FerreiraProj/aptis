"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { usePlanErrorMessage } from "@/components/use-plan-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MAX_FILE_SIZE_BYTES } from "@/lib/constants";
import {
  UPLOAD_ACCEPT,
  detectUploadType,
  legacyOfficeFormat,
} from "@/lib/document-processing/file-types";
import { FileText, Youtube, Upload, CheckCircle2, Lock, BookMarked } from "lucide-react";

type UploadMode = "file" | "youtube";

interface Subject {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

export function UploadZone({ subjects = [] }: { subjects?: Subject[] }) {
  const router = useRouter();
  const planErrorMessage = usePlanErrorMessage();
  const [mode, setMode] = useState<UploadMode>("file");
  const [isDragOver, setIsDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const dropped = e.dataTransfer.files[0];
    if (dropped) validateAndSetFile(dropped);
  }, []);

  function validateAndSetFile(f: File) {
    if (!detectUploadType(f.name, f.type)) {
      const legacy = legacyOfficeFormat(f.name, f.type);
      toast.error(
        legacy
          ? `Ficheiros .${legacy} antigos não são suportados. Abre-o e guarda como .${legacy}x.`
          : `Formato não suportado: ${f.type || f.name}`
      );
      return;
    }
    if (f.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`Ficheiro muito grande. Máximo: 50MB`);
      return;
    }
    setFile(f);
  }

  async function handleUpload() {
    if (!file && !youtubeUrl) return;

    setUploading(true);
    setUploadProgress(10);

    try {
      let response: Response;

      if (mode === "youtube") {
        response = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            youtubeUrl,
            title: youtubeUrl,
            ...(selectedSubjectId ? { subjectId: selectedSubjectId } : {}),
          }),
        });
      } else if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("title", file.name);
        if (selectedSubjectId) formData.append("subjectId", selectedSubjectId);

        setUploadProgress(30);
        response = await fetch("/api/documents", {
          method: "POST",
          body: formData,
        });
      } else {
        return;
      }

      setUploadProgress(70);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(planErrorMessage(error) ?? error.error ?? "Upload failed");
      }

      const { document } = await response.json();
      setUploadProgress(100);

      toast.success("Documento carregado! A processar...");

      setTimeout(() => {
        router.push(`/documents/${document.id}`);
      }, 500);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao carregar documento"
      );
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Mode selector */}
      <div className="glass-sm flex gap-1 rounded-xl p-1">
        <button
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all ${mode === "file"
            ? "btn-gradient text-white shadow-sm"
            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            }`}
          onClick={() => setMode("file")}
        >
          <FileText size={15} />
          Documento
        </button>
        <button
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all ${mode === "youtube"
            ? "btn-gradient text-white shadow-sm"
            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            }`}
          onClick={() => setMode("youtube")}
        >
          <Youtube size={15} />
          YouTube
        </button>
      </div>

      {mode === "file" ? (
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Carregar Documento</CardTitle>
            <CardDescription>
              PDF, Word (.docx), PowerPoint (.pptx), texto ou imagem dos teus apontamentos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Drop zone */}
            <div
              className={`flex flex-col items-center justify-center gap-1 rounded-3xl border-2 border-dashed p-6 text-center transition-all cursor-pointer ${isDragOver
                ? "border-primary bg-primary/10"
                : file
                  ? "border-primary/50 bg-primary/5"
                  : "border-primary/30 hover:border-primary/60 hover:bg-primary/5"
                }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {file ? (
                <>
                  <CheckCircle2 size={40} className="text-primary" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                    <Upload size={24} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      Arrasta e larga ou clica para selecionar
                    </p>
                    <p className="text-sm text-muted-foreground">
                      PDF, DOCX, PPTX, TXT, JPG, PNG — máximo 50MB
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Ficheiros .doc e .ppt antigos não são suportados — guarda como .docx ou .pptx
                    </p>
                  </div>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={UPLOAD_ACCEPT}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) validateAndSetFile(f);
                }}
              />
            </div>

            {file && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFile(null)}
                className="w-full"
              >
                Remover ficheiro
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Transcrever YouTube</CardTitle>
            <CardDescription>
              Cola o link de uma aula ou vídeo educativo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>URL do YouTube</Label>
              <Input
                type="url"
                placeholder="https://youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Funciona com vídeos que têm legendas/transcrição disponível
            </p>
          </CardContent>
        </Card>
      )}

      {/* Subject selector */}
      {subjects.length > 0 && (
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-sm font-medium">
            <BookMarked size={14} />
            Disciplina <span className="text-muted-foreground font-normal">(opcional)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedSubjectId(null)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${selectedSubjectId === null
                ? "bg-primary text-primary-foreground"
                : "glass-sm text-muted-foreground hover:text-foreground"
                }`}
            >
              Nenhuma
            </button>
            {subjects.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedSubjectId(selectedSubjectId === s.id ? null : s.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${selectedSubjectId === s.id ? "text-white" : "glass-sm text-muted-foreground hover:text-foreground"
                  }`}
                style={selectedSubjectId === s.id ? { backgroundColor: s.color } : {}}
              >
                <span>{s.emoji}</span>
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div className="space-y-2">
          <Progress value={uploadProgress} />
          <p className="text-center text-sm text-muted-foreground">
            {uploadProgress < 50
              ? "A carregar ficheiro..."
              : uploadProgress < 90
                ? "A extrair texto..."
                : "A finalizar..."}
          </p>
        </div>
      )}

      {/* Submit button */}
      <Button
        className="w-full"
        size="lg"
        onClick={handleUpload}
        disabled={
          uploading ||
          (mode === "file" && !file) ||
          (mode === "youtube" && !youtubeUrl)
        }
      >
        {uploading ? "A processar..." : "Carregar e processar"}
      </Button>

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <Lock size={11} />
        O teu ficheiro é eliminado imediatamente após extração. Só guardamos
        o texto extraído.
      </p>
    </div>
  );
}
