import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseDocx } from "./office-parser";

const fixture = readFileSync(join(__dirname, "__fixtures__", "sample.docx"));

describe("parseDocx", () => {
  it("extracts headings, paragraphs and table text from a .docx", async () => {
    const text = await parseDocx(fixture);
    expect(text).toContain("A Célula");
    expect(text).toContain("A célula é a unidade básica da vida.");
    expect(text).toContain("Síntese de proteínas");
    expect(text).toContain("Mitocôndria");
    expect(text).toContain("Respiração celular");
    expect(text).toContain("Fim do resumo de biologia.");
  });

  it("keeps paragraphs on separate lines", async () => {
    const text = await parseDocx(fixture);
    const lines = text.split("\n").map((l) => l.trim());
    expect(lines).toContain("A Célula");
    expect(lines).toContain("Fim do resumo de biologia.");
  });

  it("fails on a file that is not a .docx", async () => {
    await expect(parseDocx(Buffer.from("not a zip file"))).rejects.toThrow();
  });
});
