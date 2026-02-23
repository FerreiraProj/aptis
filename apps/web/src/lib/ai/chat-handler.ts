import { streamText, type CoreMessage } from "ai";
import { anthropic, MODELS } from "./client";
import { searchSimilarChunks } from "@/lib/vector/search";
import { prisma } from "@aptis/database";
import { logApiUsage } from "./usage-logger";

interface HandleChatMessageOptions {
  conversationId: string;
  userId: string;
  userMessage: string;
  documentIds: string[];
  history: CoreMessage[];
  explanationStyle?: "CONCISE" | "DETAILED" | "VISUAL" | "ANALOGICAL";
}

const STYLE_INSTRUCTIONS = {
  CONCISE: "Be concise and direct. Short, precise answers.",
  DETAILED:
    "Provide thorough explanations with full clinical context and examples.",
  VISUAL:
    "Use visual metaphors, analogies, and spatial descriptions to explain concepts.",
  ANALOGICAL:
    "Explain using everyday analogies and comparisons the student can relate to.",
};

export async function handleChatMessage(
  options: HandleChatMessageOptions
): Promise<Response> {
  const {
    conversationId,
    userId,
    userMessage,
    documentIds,
    history,
    explanationStyle = "CONCISE",
  } = options;

  const start = Date.now();

  // 1. Vector search across user's documents
  const relevantChunks =
    documentIds.length > 0
      ? await searchSimilarChunks({
          query: userMessage,
          documentIds,
          userId,
          topK: 5,
          threshold: 0.6,
        })
      : [];

  // 2. Get conversation context (weaknesses)
  const conversation = await prisma.chatConversation.findUnique({
    where: { id: conversationId },
    select: { knownWeaknesses: true },
  });

  const context =
    relevantChunks.length > 0
      ? relevantChunks
          .map((c, i) => `[Fonte ${i + 1}]: ${c.content}`)
          .join("\n\n")
      : "Sem contexto específico recuperado — responde com base no teu conhecimento médico geral.";

  const systemPrompt = `És um tutor de medicina pessoal e especialista.
Tens acesso aos materiais de estudo do aluno e conheces o seu percurso de aprendizagem.

ESTILO DE RESPOSTA: ${STYLE_INSTRUCTIONS[explanationStyle]}

MATERIAL DE ESTUDO (contexto RAG):
${context}

${
  conversation?.knownWeaknesses && conversation.knownWeaknesses.length > 0
    ? `DIFICULDADES CONHECIDAS DO ALUNO:\n${conversation.knownWeaknesses.join("\n")}\n\nPresta atenção extra a estes tópicos se aparecerem.`
    : ""
}

Instruções:
- Responde com base no material de estudo fornecido
- Se não encontrares a resposta no contexto, diz isso claramente e responde com conhecimento geral
- Usa terminologia médica correta
- Se detetares que o aluno está confuso, identifica o erro conceptual específico
- Faz perguntas socráticas quando útil para verificar compreensão
- Cita as fontes relevantes quando usares o material de estudo`;

  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // 3. Stream response
  const result = streamText({
    model: anthropic(MODELS.SONNET),
    system: systemPrompt,
    messages: [
      ...history.slice(-10), // last 10 messages for context window management
      { role: "user", content: userMessage },
    ],
    maxTokens: 1500,
    onFinish: async ({ text, usage }) => {
      totalInputTokens = usage.promptTokens;
      totalOutputTokens = usage.completionTokens;

      // Persist both messages
      await prisma.chatMessage.createMany({
        data: [
          {
            conversationId,
            role: "USER",
            content: userMessage,
          },
          {
            conversationId,
            role: "ASSISTANT",
            content: text,
            tokensUsed: usage.totalTokens,
            modelUsed: MODELS.SONNET,
            sourceChunkIds: relevantChunks.map((c) => c.id),
          },
        ],
      });

      // Update conversation timestamp
      await prisma.chatConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      await logApiUsage({
        userId,
        feature: "CHAT_RESPONSE",
        model: MODELS.SONNET,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        durationMs: Date.now() - start,
      });
    },
  });

  return result.toDataStreamResponse();
}
