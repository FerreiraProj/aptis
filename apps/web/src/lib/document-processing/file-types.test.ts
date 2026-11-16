import { describe, expect, it } from "vitest";
import {
  DOCX_MIME,
  PPTX_MIME,
  UPLOAD_ACCEPT,
  detectUploadType,
  legacyOfficeFormat,
} from "./file-types";

describe("detectUploadType", () => {
  it("detects Word by MIME type", () => {
    expect(detectUploadType("notas.docx", DOCX_MIME)).toEqual({
      sourceType: "WORD",
      mimeType: DOCX_MIME,
    });
  });

  it("falls back to the extension when the browser sends no MIME type", () => {
    expect(detectUploadType("Resumo Biologia.DOCX", "")?.sourceType).toBe("WORD");
    expect(detectUploadType("slides.pptx", "application/octet-stream")).toEqual({
      sourceType: "POWERPOINT",
      mimeType: PPTX_MIME,
    });
    expect(detectUploadType("notes.docx", "application/zip")?.mimeType).toBe(DOCX_MIME);
  });

  it("keeps the existing formats working", () => {
    expect(detectUploadType("a.pdf", "application/pdf")?.sourceType).toBe("PDF");
    expect(detectUploadType("a.txt", "text/plain")?.sourceType).toBe("TEXT");
    expect(detectUploadType("a.png", "image/png")?.sourceType).toBe("IMAGE");
    expect(detectUploadType("a.pptx", PPTX_MIME)?.sourceType).toBe("POWERPOINT");
  });

  it("rejects unsupported formats", () => {
    expect(detectUploadType("old.doc", "application/msword")).toBeNull();
    expect(detectUploadType("old.doc", "")).toBeNull();
    expect(detectUploadType("sheet.xlsx", "")).toBeNull();
    expect(detectUploadType("noext", "")).toBeNull();
    // A known MIME type wins over a misleading extension
    expect(detectUploadType("fake.docx", "application/x-msdownload")).toBeNull();
  });
});

describe("legacyOfficeFormat", () => {
  it("flags old binary Word and PowerPoint files", () => {
    expect(legacyOfficeFormat("trabalho.doc", "")).toBe("doc");
    expect(legacyOfficeFormat("x", "application/msword")).toBe("doc");
    expect(legacyOfficeFormat("aula.PPT", "")).toBe("ppt");
    expect(legacyOfficeFormat("notas.docx", DOCX_MIME)).toBeNull();
  });
});

describe("UPLOAD_ACCEPT", () => {
  it("lists Word by MIME type and extension", () => {
    expect(UPLOAD_ACCEPT).toContain(DOCX_MIME);
    expect(UPLOAD_ACCEPT).toContain(".docx");
  });
});
