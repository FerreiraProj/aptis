import { embed, embedMany } from "ai";
import { openai, MODELS } from "./client";
import { logApiUsage } from "./usage-logger";

const EMBEDDING_MODEL = openai.embedding(MODELS.EMBEDDING);

/**
 * Generate embedding for a single text string.
 */
export async function generateEmbedding(
  text: string,
  userId?: string
): Promise<number[]> {
  const start = Date.now();

  const { embedding, usage } = await embed({
    model: EMBEDDING_MODEL,
    value: text,
  });

  if (userId) {
    await logApiUsage({
      userId,
      feature: "EMBEDDING_GENERATION",
      model: MODELS.EMBEDDING,
      inputTokens: usage.tokens,
      outputTokens: 0,
      durationMs: Date.now() - start,
    });
  }

  return embedding;
}

/**
 * Generate embeddings for multiple texts in a single API call (batch).
 */
export async function generateEmbeddings(
  texts: string[],
  userId?: string
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const start = Date.now();

  // Process in batches of 100 to avoid rate limits
  const BATCH_SIZE = 100;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const { embeddings, usage } = await embedMany({
      model: EMBEDDING_MODEL,
      values: batch,
    });

    allEmbeddings.push(...embeddings);

    if (userId) {
      await logApiUsage({
        userId,
        feature: "EMBEDDING_GENERATION",
        model: MODELS.EMBEDDING,
        inputTokens: usage.tokens,
        outputTokens: 0,
        durationMs: Date.now() - start,
      });
    }
  }

  return allEmbeddings;
}

/**
 * Format embedding array as PostgreSQL vector literal.
 * e.g., [0.1, 0.2, 0.3] -> '[0.1,0.2,0.3]'
 */
export function formatVectorForPg(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
