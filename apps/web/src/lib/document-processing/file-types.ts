/**
 * Upload file-type detection, shared by the upload zone (client) and the
 * upload API (server).
 *
 * Browsers don't always send a MIME type for Office files (e.g. Windows
 * without Office installed sends "" for .docx), so the extension is used as
 * a fallback.
 */

export const PDF_MIME = "application/pdf";
export const PPTX_MIME =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";
export const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type UploadSourceType = "PDF" | "POWERPOINT" | "WORD" | "TEXT" | "IMAGE";

const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"];

const EXTENSION_TYPES: Record<string, { sourceType: UploadSourceType; mimeType: string }> = {
  pdf: { sourceType: "PDF", mimeType: PDF_MIME },
  pptx: { sourceType: "POWERPOINT", mimeType: PPTX_MIME },
  docx: { sourceType: "WORD", mimeType: DOCX_MIME },
  txt: { sourceType: "TEXT", mimeType: "text/plain" },
  jpg: { sourceType: "IMAGE", mimeType: "image/jpeg" },
  jpeg: { sourceType: "IMAGE", mimeType: "image/jpeg" },
  png: { sourceType: "IMAGE", mimeType: "image/png" },
  webp: { sourceType: "IMAGE", mimeType: "image/webp" },
};

/** Value for the file input's `accept` attribute (MIME types + extensions). */
export const UPLOAD_ACCEPT = [
  PDF_MIME,
  PPTX_MIME,
  DOCX_MIME,
  "text/plain",
  ...IMAGE_MIMES,
  ...Object.keys(EXTENSION_TYPES).map((ext) => `.${ext}`),
].join(",");

function extensionOf(fileName: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(fileName.trim());
  return match ? match[1].toLowerCase() : "";
}

/**
 * Resolve the source type and a normalised MIME type for an uploaded file,
 * or null when the format is not supported.
 */
export function detectUploadType(
  fileName: string,
  mimeType: string | null | undefined
): { sourceType: UploadSourceType; mimeType: string } | null {
  const mime = (mimeType ?? "").toLowerCase();

  if (mime === PDF_MIME) return { sourceType: "PDF", mimeType: PDF_MIME };
  if (mime === PPTX_MIME) return { sourceType: "POWERPOINT", mimeType: PPTX_MIME };
  if (mime === DOCX_MIME) return { sourceType: "WORD", mimeType: DOCX_MIME };
  if (mime === "text/plain") return { sourceType: "TEXT", mimeType: mime };
  if (IMAGE_MIMES.includes(mime)) return { sourceType: "IMAGE", mimeType: mime };

  // Missing or generic MIME type → trust the extension
  if (!mime || mime === "application/octet-stream" || mime === "application/zip") {
    return EXTENSION_TYPES[extensionOf(fileName)] ?? null;
  }
  return null;
}

/** Old binary Office formats we can't read — the user should re-save them. */
export function legacyOfficeFormat(
  fileName: string,
  mimeType: string | null | undefined
): "doc" | "ppt" | null {
  const ext = extensionOf(fileName);
  const mime = (mimeType ?? "").toLowerCase();
  if (ext === "doc" || mime === "application/msword") return "doc";
  if (ext === "ppt" || mime === "application/vnd.ms-powerpoint") return "ppt";
  return null;
}
