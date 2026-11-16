/**
 * Split a long document into segments so AI generation covers the WHOLE
 * document instead of only its first few pages.
 *
 * All functions here are pure (no I/O) — see segments.test.ts.
 */

export const DEFAULT_SEGMENT_CHARS = 12_000;
export const DEFAULT_MAX_SEGMENTS = 8;
export const DEFAULT_MIN_ITEMS_PER_SEGMENT = 3;

/**
 * Split text into segments of at most ~`segmentChars`, preferring paragraph
 * boundaries. Paragraphs longer than `segmentChars` are hard-split.
 */
export function splitIntoSegments(
  text: string,
  segmentChars: number = DEFAULT_SEGMENT_CHARS
): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const segments: string[] = [];
  let current = "";

  const flush = () => {
    if (current.trim()) segments.push(current.trim());
    current = "";
  };

  for (const para of paragraphs) {
    if (para.length > segmentChars) {
      flush();
      for (let i = 0; i < para.length; i += segmentChars) {
        segments.push(para.slice(i, i + segmentChars));
      }
      continue;
    }
    if (current && current.length + para.length + 2 > segmentChars) flush();
    current = current ? `${current}\n\n${para}` : para;
  }
  flush();

  return segments;
}

/** Pick `n` items spread evenly from start to end (always includes the first; the last when n ≥ 2). */
export function pickEvenly<T>(items: T[], n: number): T[] {
  if (n <= 0 || items.length === 0) return [];
  if (n >= items.length) return [...items];
  if (n === 1) return [items[0]];
  const picked: T[] = [];
  for (let i = 0; i < n; i++) {
    picked.push(items[Math.round((i * (items.length - 1)) / (n - 1))]);
  }
  return picked;
}

/**
 * Split `total` into integers proportional to `weights` (largest remainder),
 * giving every slot at least 1 when total ≥ weights.length. Sum always equals total.
 */
export function distributeCount(total: number, weights: number[]): number[] {
  const n = weights.length;
  if (n === 0 || total <= 0) return weights.map(() => 0);

  const base = total >= n ? 1 : 0;
  const result = weights.map(() => base);
  let remaining = total - base * n;
  if (remaining === 0) return result;

  const positive = weights.map((w) => Math.max(0, w));
  const wsum = positive.reduce((s, w) => s + w, 0);
  const norm = wsum > 0 ? positive.map((w) => w / wsum) : positive.map(() => 1 / n);
  const exact = norm.map((w) => w * remaining);
  const floors = exact.map(Math.floor);
  floors.forEach((f, i) => (result[i] += f));
  remaining -= floors.reduce((s, f) => s + f, 0);

  const order = exact
    .map((e, i) => ({ i, frac: e - Math.floor(e) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < remaining; k++) result[order[k % n].i] += 1;

  return result;
}

export type SegmentPlan = {
  text: string;
  count: number;
  /** 1-based position of the segment within the chosen set */
  part: number;
  totalParts: number;
};

/**
 * Decide which segments to send to the model and how many items to ask for in each.
 * Small requests use fewer segments (≥ minPerSegment items each); long documents
 * beyond maxSegments are sampled evenly from start to end.
 */
export function planSegments(
  text: string,
  totalCount: number,
  {
    segmentChars = DEFAULT_SEGMENT_CHARS,
    maxSegments = DEFAULT_MAX_SEGMENTS,
    minPerSegment = DEFAULT_MIN_ITEMS_PER_SEGMENT,
  }: { segmentChars?: number; maxSegments?: number; minPerSegment?: number } = {}
): SegmentPlan[] {
  if (totalCount <= 0) return [];
  const segments = splitIntoSegments(text, segmentChars);
  if (segments.length === 0) return [];

  const n = Math.max(
    1,
    Math.min(segments.length, maxSegments, Math.floor(totalCount / minPerSegment))
  );
  const chosen = pickEvenly(segments, n);
  const counts = distributeCount(
    totalCount,
    chosen.map((s) => s.length)
  );

  return chosen
    .map((segText, i) => ({ text: segText, count: counts[i], part: i + 1, totalParts: chosen.length }))
    .filter((s) => s.count > 0);
}

/**
 * Run `fn` for every segment in parallel. Failed segments are logged and skipped;
 * throws only if ALL segments fail.
 */
export async function runForSegments<T>(
  plans: SegmentPlan[],
  fn: (plan: SegmentPlan) => Promise<T>,
  label: string
): Promise<T[]> {
  const settled = await Promise.allSettled(plans.map(fn));
  const ok: T[] = [];
  let firstError: unknown = null;
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") ok.push(r.value);
    else {
      firstError ??= r.reason;
      console.error(`[${label}] segment ${i + 1}/${plans.length} failed:`, r.reason);
    }
  });
  if (ok.length === 0) throw firstError ?? new Error(`${label}: no segments to process`);
  return ok;
}
