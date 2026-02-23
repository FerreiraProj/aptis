"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { SUPPORTED_FILE_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/constants";

type UploadMode = "file" | "youtube";

export function UploadZone() {
  const router = useRouter();
  const [mode, setMode] = useState<UploadMode>("file");
  const [isDragOver, setIsDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
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
    if (!SUPPORTED_FILE_TYPES.includes(f.type as never)) {
      toast.error(`Formato não suportado: ${f.type}`);
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
          body: JSON.stringify({ youtubeUrl, title: youtubeUrl }),
        });
      } else if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("title", file.name);

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
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const { document } = await response.json();
      setUploadProgress(100);

      toast.success("Documento carregado! A processar...");

      // Redirect to document page
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
      <div className="flex gap-2 rounded-lg border p-1">
        <button
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            mode === "file"
              ? "bg-primary text-primary-foreground"
              : "hover:bg-accent"
          }`}
          onClick={() => setMode("file")}
        >
          📄 Documento
        </button>
        <button
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            mode === "youtube"
              ? "bg-primary text-primary-foreground"
              : "hover:bg-accent"
          }`}
          onClick={() => setMode("youtube")}
        >
          ▶️ YouTube
        </button>
      </div>

      {mode === "file" ? (
        <Card>
          <CardHeader>
            <CardTitle>Carregar Documento</CardTitle>
            <CardDescription>
              PDF, PowerPoint, texto ou imagem dos teus apontamentos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Drop zone */}
            <div
              className={`flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
                isDragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-4xl">{file ? "✅" : "📎"}</div>
              {file ? (
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-medium">
                    Arrasta e larga ou clica para selecionar
                  </p>
                  <p className="text-sm text-muted-foreground">
                    PDF, PPT, TXT, JPG, PNG — máximo 50MB
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={SUPPORTED_FILE_TYPES.join(",")}
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
        <Card>
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

      <p className="text-center text-xs text-muted-foreground">
        🔒 O teu ficheiro é eliminado imediatamente após extração. Só guardamos
        o texto extraído.
      </p>
    </div>
  );
}
