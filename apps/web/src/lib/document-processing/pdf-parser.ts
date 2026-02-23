/**
 * PDF text extraction using pdf-parse.
 * Handles text-based PDFs. For scanned PDFs, falls back to OCR.
 */

interface ParsedPdf {
  text: string;
  numPages: number;
  info: Record<string, unknown>;
}

export async function parsePdf(buffer: Buffer): Promise<ParsedPdf> {
  // Dynamic import to avoid issues with Next.js bundling
  const pdfParse = (await import("pdf-parse")).default;

  const data = await pdfParse(buffer, {
    // Limit pages for very large PDFs
    max: 200,
  });

  return {
    text: cleanText(data.text),
    numPages: data.numpages,
    info: data.info || {},
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
