import { describe, expect, it, vi } from "vitest";
import {
  distributeCount,
  pickEvenly,
  planSegments,
  runForSegments,
  splitIntoSegments,
} from "./segments";

/** n paragraphs of ~len chars each, tagged so we can tell them apart */
function makeDoc(n: number, len = 1000): string {
  return Array.from({ length: n }, (_, i) => `P${i}:` + "x".repeat(len)).join("\n\n");
}

describe("splitIntoSegments", () => {
  it("keeps short text in a single segment", () => {
    expect(splitIntoSegments("hello\n\nworld", 100)).toEqual(["hello\n\nworld"]);
  });

  it("never exceeds the segment size and keeps all content", () => {
    const doc = makeDoc(30, 1000);
    const segs = splitIntoSegments(doc, 5000);
    expect(segs.length).toBeGreaterThan(1);
    for (const s of segs) expect(s.length).toBeLessThanOrEqual(5000);
    expect(segs.join("\n\n").replace(/\s/g, "")).toBe(doc.replace(/\s/g, ""));
  });

  it("hard-splits a single huge paragraph", () => {
    const segs = splitIntoSegments("y".repeat(25_000), 10_000);
    expect(segs.map((s) => s.length)).toEqual([10_000, 10_000, 5_000]);
  });

  it("returns nothing for blank text", () => {
    expect(splitIntoSegments("  \n\n  ")).toEqual([]);
  });
});

describe("pickEvenly", () => {
  const items = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  it("spans start to end", () => {
    expect(pickEvenly(items, 3)).toEqual([0, 5, 9]);
    expect(pickEvenly(items, 2)).toEqual([0, 9]);
  });
  it("returns everything when n >= length", () => {
    expect(pickEvenly(items, 20)).toEqual(items);
  });
  it("handles edge cases", () => {
    expect(pickEvenly(items, 0)).toEqual([]);
    expect(pickEvenly(items, 1)).toEqual([0]);
    expect(pickEvenly([], 3)).toEqual([]);
  });
});

describe("distributeCount", () => {
  it("always sums to the total", () => {
    for (const total of [1, 5, 7, 20, 50]) {
      const out = distributeCount(total, [3, 1, 1, 5]);
      expect(out.reduce((a, b) => a + b, 0)).toBe(total);
    }
  });

  it("gives every slot at least one when possible", () => {
    expect(distributeCount(4, [100, 1, 1, 1])).toEqual([1, 1, 1, 1]);
    expect(Math.min(...distributeCount(10, [100, 1, 1]))).toBeGreaterThanOrEqual(1);
  });

  it("is proportional to weights", () => {
    expect(distributeCount(12, [1, 1, 1])).toEqual([4, 4, 4]);
    const [a, b] = distributeCount(22, [10, 1]);
    expect(a).toBeGreaterThan(b);
  });

  it("handles zero weights and zero total", () => {
    expect(distributeCount(6, [0, 0, 0])).toEqual([2, 2, 2]);
    expect(distributeCount(0, [1, 2])).toEqual([0, 0]);
  });
});

describe("planSegments", () => {
  it("covers the end of a long document, not only the start", () => {
    const doc = makeDoc(100, 1000); // ~100k chars
    const plan = planSegments(doc, 30);
    expect(plan.length).toBe(8); // capped at maxSegments
    expect(plan[0].text).toContain("P0:");
    expect(plan[plan.length - 1].text).toContain("P99:");
    expect(plan.reduce((s, p) => s + p.count, 0)).toBe(30);
  });

  it("uses fewer segments for small requests", () => {
    const plan = planSegments(makeDoc(100, 1000), 5);
    expect(plan.length).toBe(1);
    expect(plan[0].count).toBe(5);
  });

  it("uses a single call for short documents", () => {
    const plan = planSegments("short text about cells", 20);
    expect(plan).toEqual([{ text: "short text about cells", count: 20, part: 1, totalParts: 1 }]);
  });

  it("returns nothing for empty input", () => {
    expect(planSegments("", 10)).toEqual([]);
    expect(planSegments("text", 0)).toEqual([]);
  });
});

describe("runForSegments", () => {
  const plans = planSegments(makeDoc(40, 1000), 12, { maxSegments: 3 });

  it("keeps successful segments when some fail", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const out = await runForSegments(
      plans,
      async (p) => {
        if (p.part === 2) throw new Error("boom");
        return p.part;
      },
      "test"
    );
    expect(out).toEqual([1, 3]);
    spy.mockRestore();
  });

  it("throws when every segment fails", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      runForSegments(plans, async () => {
        throw new Error("all down");
      }, "test")
    ).rejects.toThrow("all down");
    spy.mockRestore();
  });
});
