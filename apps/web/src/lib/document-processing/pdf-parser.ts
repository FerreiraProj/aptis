/**
 * PDF text extraction using pdf-parse v1.
 * Handles text-based PDFs. For scanned PDFs, falls back to OCR.
 */

interface ParsedPdf {
  text: string;
  numPages: number;
  info: Record<string, unknown>;
}

export async function parsePdf(buffer: Buffer): Promise<ParsedPdf> {
  // pdf-parse v1 is a CJS module — use .default for ESM interop
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);

  return {
    text: cleanText(data.text),
    numPages: data.numpages,
    info: (data.info as Record<string, unknown>) ?? {},
  };
}

/**
 * Clean extracted text: remove excessive whitespace, fix encoding issues.
 */
function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, "\n") // normalize line endings
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ") // collapse spaces/tabs
    .replace(/\n{3,}/g, "\n\n") // max 2 consecutive newlines
    .replace(/[^\x20-\x7E\x80-\xFF\n\t]/g, " ") // remove control chars
    .trim();
}

/**
 * Check if a PDF likely needs OCR (has little extractable text).
 */
export function needsOcr(parsedText: string, numPages: number): boolean {
  const avgCharsPerPage = parsedText.length / Math.max(numPages, 1);
  // If less than 100 chars per page on average, likely a scanned PDF
  return avgCharsPerPage < 100;
}
