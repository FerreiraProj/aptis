/**
 * Office (OOXML) text extraction using officeparser v6.
 * Handles .pptx (PowerPoint) and .docx (Word). The old binary formats
 * (.ppt / .doc) are NOT supported by officeparser — they are rejected at upload.
 *
 * officeparser reliably detects file format from the extension, so we write the buffer
 * to a temp file, parse it, then clean up immediately.
 */

import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

type OfficeExtension = "pptx" | "docx";

async function parseOfficeFile(buffer: Buffer, ext: OfficeExtension): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod = await import("officeparser") as any;

  const parseOffice: (file: string) => Promise<unknown> =
    mod.parseOffice ?? mod.default?.parseOffice;

  if (typeof parseOffice !== "function") {
    throw new Error(
      `officeparser: parseOffice not found. Exports: ${Object.keys(mod).join(", ")}`
    );
  }

  // Write buffer to a temp file so officeparser can detect format from extension
  const tmpPath = join(tmpdir(), `${randomUUID()}.${ext}`);
  try {
    writeFileSync(tmpPath, buffer);
    const result = await parseOffice(tmpPath);
    let text: string;
    if (typeof result === "string") {
      text = result;
    } else if (Buffer.isBuffer(result)) {
      text = (result as Buffer).toString("utf-8");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } else if (result && typeof (result as any).toText === "function") {
      // officeparser v6 returns a structured object with a toText() helper
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      text = (result as any).toText();
    } else {
      text = "";
    }
    return cleanText(text);
  } finally {
    try { unlinkSync(tmpPath); } catch { /* ignore cleanup errors */ }
  }
}

export function parsePptx(buffer: Buffer): Promise<string> {
  return parseOfficeFile(buffer, "pptx");
}

export function parseDocx(buffer: Buffer): Promise<string> {
  return parseOfficeFile(buffer, "docx");
}

function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
