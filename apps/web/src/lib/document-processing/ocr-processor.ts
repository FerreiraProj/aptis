/**
 * OCR processor using Tesseract.js.
 * Handles scanned PDFs and image-based documents.
 */

import os from "node:os";
import type { Worker } from "tesseract.js";

/** Stop OCR'ing new pages after this long, keeping what was already read (maxDuration is 300 s). */
const PDF_OCR_TIME_BUDGET_MS = 200_000;
const PDF_OCR_MAX_PAGES = 50;

async function createOcrWorker(): Promise<Worker> {
  const { createWorker } = await import("tesseract.js");
  return createWorker(["por", "eng"], 1, {
    logger: () => {}, // suppress logs
    // Language data is downloaded once and cached. On Vercel only /tmp is writable.
    ...(process.env.VERCEL ? { cachePath: os.tmpdir() } : {}),
  });
}

async function recognize(
  worker: Worker,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;
  const {
    data: { text },
  } = await worker.recognize(dataUrl);
  return text.trim();
}

export async function runOcrOnBuffer(
  buffer: Buffer,
  mimeType: string = "image/png"
): Promise<string> {
  const worker = await createOcrWorker();
  try {
    return await recognize(worker, buffer, mimeType);
  } finally {
    await worker.terminate();
  }
}

/**
 * Run OCR on a PDF by converting pages to images first.
 * Only used when pdf-parse returns insufficient text.
 *
 * pdf2pic needs GraphicsMagick + Ghostscript binaries on the host. They are not
 * available on every platform (e.g. Vercel serverless) — in that case we fail
 * with a clear message instead of an obscure spawn error.
 */
export async function runOcrOnPdf(buffer: Buffer): Promise<string> {
  const { fromBuffer } = await import("pdf2pic");

  const pdfParse = (await import("pdf-parse")).default;
  const parsed = await pdfParse(buffer);
  const numPages = parsed.numpages ?? 1;

  const convert = fromBuffer(buffer, {
    density: 150, // DPI — balance quality vs speed
    saveFilename: "page",
    savePath: os.tmpdir(),
    format: "png",
    width: 1700,
    height: 2200,
  });

  const maxPages = Math.min(numPages, PDF_OCR_MAX_PAGES);
  const start = Date.now();
  const texts: string[] = [];

  // One worker for all pages — loading the language model is the slow part.
  const worker = await createOcrWorker();
  try {
    for (let page = 1; page <= maxPages; page++) {
      if (Date.now() - start > PDF_OCR_TIME_BUDGET_MS) {
        console.warn(
          `[ocr] time budget reached after ${page - 1}/${maxPages} pages — using partial text`
        );
        break;
      }

      let pageBuffer: Buffer | null = null;
      try {
        const out = await convert(page, { responseType: "buffer" });
        if (out.buffer) {
          pageBuffer = Buffer.from(out.buffer as unknown as ArrayBuffer);
        }
      } catch (err) {
        if (page === 1) {
          console.error("[ocr] pdf2pic conversion failed:", err);
          throw new Error(
            "This PDF looks scanned (image-only) and could not be converted for OCR on this server. " +
              "Try uploading the pages as images (JPG/PNG) or a PDF with selectable text."
          );
        }
        console.warn(`[ocr] failed to convert page ${page}, skipping:`, err);
        continue;
      }

      if (pageBuffer) {
        const pageText = await recognize(worker, pageBuffer, "image/png");
        if (pageText) texts.push(pageText);
      }
    }
  } finally {
    await worker.terminate();
  }

  return texts.join("\n\n");
}
