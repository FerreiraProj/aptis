import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";

export const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Model aliases for cost control
// Haiku: simple generation tasks (fast, cheap)
// Sonnet: complex reasoning tasks (accurate, more expensive)
export const MODELS = {
  HAIKU: "claude-haiku-4-5" as const,
  SONNET: "claude-sonnet-4-5" as const,
  EMBEDDING: "text-embedding-3-small" as const,
} as const;

export type ModelName = (typeof MODELS)[keyof typeof MODELS];

// Approximate cost per 1M tokens (USD) — for logging
export const MODEL_COSTS = {
  [MODELS.HAIKU]: { input: 0.8, output: 4.0 },
  [MODELS.SONNET]: { input: 3.0, output: 15.0 },
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
