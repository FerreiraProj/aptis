/**
 * Document processing pipeline.
 *
 * Flow: Upload to Supabase Storage → Extract text → DELETE file → Chunk → Embed → Store
 *
 * The file is ALWAYS deleted after text extraction. We only store:
 * - Extracted text in Document.extractedText
 * - Vector embeddings in DocumentChunk
 * - Metadata (word count, topics, etc.)
 */

import { prisma } from "@aptis/database";
import type { SourceType } from "@aptis/database";
import { parsePdf, needsOcr } from "./pdf-parser";
import { runOcrOnBuffer, runOcrOnPdf } from "./ocr-processor";
import { transcribeYouTube } from "./youtube-transcriber";
import { chunkText } from "./text-chunker";
import { generateEmbeddings, formatVectorForPg } from "@/lib/ai/embedding-generator";
import { createAdminClient } from "@/lib/supabase/server";

const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "uploads";

interface ProcessDocumentOptions {
  documentId: string;
  userId: string;
  storagePath?: string; // Path in Supabase Storage (for file uploads)
  youtubeUrl?: string; // For YouTube transcription
  sourceType: SourceType;
  mimeType?: string;
}

export async function processDocument(
  options: ProcessDocumentOptions
): Promise<void> {
  const { documentId, userId, storagePath, youtubeUrl, sourceType, mimeType } =
    options;

  // 1. Mark as PROCESSING
  await prisma.document.update({
    where: { id: documentId },
    data: { status: "PROCESSING" },
  });

  try {
    let extractedText = "";
    let pageCount: number | undefined;

    if (sourceType === "YOUTUBE" && youtubeUrl) {
      // YouTube transcription — no file involved
      const { text } = await transcribeYouTube(youtubeUrl);
      extractedText = text;
    } else if (storagePath) {
      // Download from Supabase Storage
      const supabase = await createAdminClient();
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(storagePath);

      if (error || !data) {
        throw new Error(`Failed to download file: ${error?.message}`);
      }

      const buffer = Buffer.from(await data.arrayBuffer());

      switch (sourceType) {
        case "PDF": {
          const parsed = await parsePdf(buffer);
          pageCount = parsed.numPages;

          if (needsOcr(parsed.text, parsed.numPages)) {
            // Scanned PDF — use OCR
            extractedText = await runOcrOnPdf(buffer);
          } else {
            extractedText = parsed.text;
          }
          break;
        }

        case "SCREENSHOT":
        case "IMAGE": {
          extractedText = await runOcrOnBuffer(
            buffer,
            mimeType || "image/png"
          );
          break;
        }

        case "TEXT": {
          extractedText = buffer.toString("utf-8");
          break;
        }

        default:
          throw new Error(`Unsupported source type: ${sourceType}`);
      }

      // 2. DELETE the file from storage IMMEDIATELY after extraction
      const { error: deleteError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([storagePath]);

      if (deleteError) {
        console.error("Failed to delete uploaded file:", deleteError);
        // Don't throw — file deletion failure shouldn't fail the whole pipeline
      }
    }

    if (!extractedText || extractedText.trim().length < 50) {
      throw new Error("Insufficient text extracted from document");
    }

    // 3. Chunk text
    const chunks = chunkText(extractedText, { maxTokens: 500, overlap: 50 });

    if (chunks.length > 0) {
      // 4. Generate embeddings in batch
      const embeddings = await generateEmbeddings(
        chunks.map((c) => c.content),
        userId
      );

      // 5. Store chunks with embeddings using raw SQL (pgvector)
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = embeddings[i];

        await prisma.$executeRaw`
          INSERT INTO document_chunks (id, document_id, chunk_index, content, token_count, embedding, created_at)
          VALUES (
            gen_random_uuid(),
            ${documentId}::uuid,
            ${chunk.chunkIndex},
            ${chunk.content},
            ${chunk.tokenCount},
            ${formatVectorForPg(embedding)}::vector,
            NOW()
          )
        `;
      }
    }

    // 6. Mark document as READY
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: "READY",
        extractedText: extractedText.slice(0, 1_000_000), // cap at 1MB
        wordCount: extractedText.split(/\s+/).length,
        pageCount,
      },
    });
  } catch (error) {
    console.error("Document processing failed:", error);

    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: "FAILED",
        errorMessage:
          error instanceof Error ? error.message : "Unknown processing error",
      },
    });

    throw error;
  }
}
