/**
 * OCR processor using Tesseract.js.
 * Handles scanned PDFs and image-based documents.
 */

export async function runOcrOnBuffer(
  buffer: Buffer,
  mimeType: string = "image/png"
): Promise<string> {
  const { createWorker } = await import("tesseract.js");

  const worker = await createWorker(["por", "eng"], 1, {
    // Support Portuguese and English
    logger: () => {}, // suppress logs
  });

  try {
    // Convert buffer to base64 data URL
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const {
      data: { text },
    } = await worker.recognize(dataUrl);

    return text.trim();
  } finally {
    await worker.terminate();
  }
}

/**
 * Run OCR on a PDF by converting pages to images first.
 * Only used when pdf-parse returns insufficient text.
 */
export async function runOcrOnPdf(buffer: Buffer): Promise<string> {
  // Dynamically import pdf2pic (requires native dependencies)
  const { fromBuffer } = await import("pdf2pic");

  const convert = fromBuffer(buffer, {
    density: 150, // DPI — balance quality vs speed
    saveFilename: "page",
    format: "png",
    width: 1700,
    height: 2200,
  });

  // Get page count from a quick parse
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer, { max: 1 });
  const numPages = data.numpages;

  const texts: string[] = [];

  // Process up to 50 pages
  const maxPages = Math.min(numPages, 50);

  for (let page = 1; page <= maxPages; page++) {
    const pageBuffer = await convert(page, { responseType: "buffer" });
    if (pageBuffer.buffer) {
      const pageText = await runOcrOnBuffer(
        Buffer.from(pageBuffer.buffer as ArrayBuffer),
        "image/png"
      );
      if (pageText.trim()) {
        texts.push(pageText);
      }
    }
  }

  return texts.join("\n\n");
}
