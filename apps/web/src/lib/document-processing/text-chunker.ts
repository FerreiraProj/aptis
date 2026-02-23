/**
 * Split text into overlapping chunks for RAG.
 * Uses token estimation (1 token ≈ 4 chars for English/PT).
 */

const CHARS_PER_TOKEN = 4;

interface ChunkOptions {
  maxTokens?: number;
  overlap?: number; // tokens of overlap between chunks
}

export interface TextChunk {
  content: string;
  tokenCount: number;
  chunkIndex: number;
  pageNumber?: number;
}

export function chunkText(
  text: string,
  options: ChunkOptions = {}
): TextChunk[] {
  const { maxTokens = 500, overlap = 50 } = options;

  const maxChars = maxTokens * CHARS_PER_TOKEN;
  const overlapChars = overlap * CHARS_PER_TOKEN;

  if (!text || text.trim().length === 0) return [];

  // Split on paragraph boundaries first for cleaner chunks
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);

  const chunks: TextChunk[] = [];
  let currentChunk = "";
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    const wouldExceed =
      currentChunk.length + paragraph.length + 2 > maxChars;

    if (wouldExceed && currentChunk.length > 0) {
      // Save current chunk
      chunks.push({
        content: currentChunk.trim(),
        tokenCount: Math.ceil(currentChunk.length / CHARS_PER_TOKEN),
        chunkIndex: chunkIndex++,
      });

      // Start new chunk with overlap from end of previous
      const overlapText = currentChunk.slice(-overlapChars);
      currentChunk = overlapText + "\n\n" + paragraph;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
    }

    // If a single paragraph exceeds max, split by sentences
    if (currentChunk.length > maxChars) {
      const sentences = currentChunk.split(/(?<=[.!?])\s+/);
      currentChunk = "";

      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > maxChars) {
          if (currentChunk.length > 0) {
            chunks.push({
              content: currentChunk.trim(),
              tokenCount: Math.ceil(currentChunk.length / CHARS_PER_TOKEN),
              chunkIndex: chunkIndex++,
            });
            currentChunk = currentChunk.slice(-overlapChars) + " " + sentence;
          } else {
            // Single sentence > maxChars — include as-is
            chunks.push({
              content: sentence.trim(),
              tokenCount: Math.ceil(sentence.length / CHARS_PER_TOKEN),
              chunkIndex: chunkIndex++,
            });
          }
        } else {
          currentChunk += (currentChunk ? " " : "") + sentence;
        }
      }
    }
  }

  // Last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      content: currentChunk.trim(),
      tokenCount: Math.ceil(currentChunk.length / CHARS_PER_TOKEN),
      chunkIndex: chunkIndex++,
    });
  }

  return chunks;
}

/**
 * Estimate token count for a text string.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}
