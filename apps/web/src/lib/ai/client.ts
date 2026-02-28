import { createOpenAI } from "@ai-sdk/openai";

export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Model aliases for cost control
// MINI: simple generation tasks (fast, very cheap) — gpt-4o-mini
// STANDARD: complex reasoning tasks (accurate) — gpt-4o
export const MODELS = {
  MINI: "gpt-4o-mini" as const,
  STANDARD: "gpt-4o" as const,
  EMBEDDING: "text-embedding-3-small" as const,
} as const;

export type ModelName = (typeof MODELS)[keyof typeof MODELS];

// Approximate cost per 1M tokens (USD) — for logging
export const MODEL_COSTS = {
  [MODELS.MINI]: { input: 0.15, output: 0.6 },
  [MODELS.STANDARD]: { input: 2.5, output: 10.0 },
  [MODELS.EMBEDDING]: { input: 0.02, output: 0 },
} as const;

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const costs = MODEL_COSTS[model as keyof typeof MODEL_COSTS];
  if (!costs) return 0;
  return (
    (inputTokens / 1_000_000) * costs.input +
    (outputTokens / 1_000_000) * costs.output
  );
}
