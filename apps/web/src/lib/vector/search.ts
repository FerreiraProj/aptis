import { prisma } from "@aptis/database";
import { generateEmbedding, formatVectorForPg } from "@/lib/ai/embedding-generator";

interface SearchOptions {
  query: string;
  documentIds: string[];
  userId: string;
  topK?: number;
  threshold?: number; // cosine similarity threshold 0-1
}

interface SearchResult {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  similarity: number;
}

/**
 * Search for semantically similar chunks using pgvector cosine similarity.
 */
export async function searchSimilarChunks(
  options: SearchOptions
): Promise<SearchResult[]> {
  const { query, documentIds, userId, topK = 5, threshold = 0.6 } = options;

  if (documentIds.length === 0) return [];

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query, userId);
  const vectorStr = formatVectorForPg(queryEmbedding);

  // Raw SQL for pgvector cosine similarity search
  const results = await prisma.$queryRaw<
    Array<{
      id: string;
      document_id: string;
      content: string;
      chunk_index: number;
      similarity: number;
    }>
  >`
    SELECT
      dc.id,
      dc.document_id,
      dc.content,
      dc.chunk_index,
      1 - (dc.embedding <=> ${vectorStr}::vector) AS similarity
    FROM document_chunks dc
    INNER JOIN documents d ON d.id = dc.document_id
    WHERE
      dc.document_id = ANY(${documentIds}::uuid[])
      AND d.user_id = ${userId}::uuid
      AND dc.embedding IS NOT NULL
      AND 1 - (dc.embedding <=> ${vectorStr}::vector) >= ${threshold}
    ORDER BY dc.embedding <=> ${vectorStr}::vector
    LIMIT ${topK}
  `;

  return results.map((r) => ({
    id: r.id,
    documentId: r.document_id,
    content: r.content,
    chunkIndex: r.chunk_index,
    similarity: r.similarity,
  }));
}
