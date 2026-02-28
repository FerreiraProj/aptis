import { streamText, generateText, type ModelMessage } from "ai";
import { openai, MODELS } from "./client";
import { searchSimilarChunks } from "@/lib/vector/search";
import { prisma } from "@aptis/database";
import { logApiUsage } from "./usage-logger";

interface HandleChatMessageOptions {
  conversationId: string;
  userId: string;
  userMessage: string;
  documentIds: string[];
  history: ModelMessage[];
  explanationStyle?: "CONCISE" | "DETAILED" | "VISUAL" | "ANALOGICAL";
  subjectName?: string;
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
    subjectName,
  } = options;

  const start = Date.now();

  // 1. Vector search across user's documents (lower threshold = more results)
  const relevantChunks =
    documentIds.length > 0
      ? await searchSimilarChunks({
          query: userMessage,
          documentIds,
          userId,
          topK: 6,
          threshold: 0.3,
        })
      : [];

  // 2. Get conversation context (weaknesses) + fallback document text
  const [conversation, fallbackDocs] = await Promise.all([
    prisma.chatConversation.findUnique({
      where: { id: conversationId },
      select: { knownWeaknesses: true },
    }),
    // Fallback: if vector search found nothing, load raw text from documents
    relevantChunks.length === 0 && documentIds.length > 0
      ? prisma.document.findMany({
          where: { id: { in: documentIds }, userId },
          select: { title: true, extractedText: true },
        })
      : Promise.resolve([]),
  ]);

  let context: string;
  if (relevantChunks.length > 0) {
    context = relevantChunks
      .map((c, i) => `[Fonte ${i + 1}]: ${c.content}`)
      .join("\n\n");
  } else if (fallbackDocs.length > 0) {
    // No vector matches — use first 4000 chars of each document as context
    context = fallbackDocs
      .map(
        (d) =>
          `[${d.title}]:\n${d.extractedText?.slice(0, 4000) ?? "(sem texto)"}`
      )
      .join("\n\n---\n\n");
  } else {
    context = `Sem contexto de documentos — responde com base no teu conhecimento geral${subjectName ? ` de ${subjectName}` : ""}.`;
  }

  const systemPrompt = `És um tutor pessoal especialista${subjectName ? ` em ${subjectName}` : ""}.
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
- Usa terminologia${subjectName ? ` de ${subjectName}` : " técnica"} correta
- Se detetares que o aluno está confuso, identifica o erro conceptual específico
- Faz perguntas socráticas quando útil para verificar compreensão
- Cita as fontes relevantes quando usares o material de estudo`;

  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // 3. Stream response
  const result = streamText({
    model: openai(MODELS.STANDARD),
    system: systemPrompt,
    messages: [
      ...history.slice(-10), // last 10 messages for context window management
      { role: "user", content: userMessage },
    ],
    maxOutputTokens: 1500,
    onFinish: async ({ text, usage }) => {
      totalInputTokens = usage.inputTokens ?? 0;
      totalOutputTokens = usage.outputTokens ?? 0;

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
            tokensUsed: (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
            modelUsed: MODELS.STANDARD,
            sourceChunkIds: relevantChunks.map((c) => c.id),
          },
        ],
      });

      // Auto-generate title on first message
      const isFirstMessage = history.length === 0;
      let generatedTitle: string | undefined;
      if (isFirstMessage) {
        try {
          const { text: titleRaw } = await generateText({
            model: openai(MODELS.MINI),
            prompt: `Cria um título muito curto (máximo 6 palavras, em português) para uma conversa de estudo que começa com esta pergunta: "${userMessage.slice(0, 300)}".\nResponde APENAS com o título, sem aspas nem pontuação no final.`,
            maxOutputTokens: 25,
          });
          generatedTitle = titleRaw.trim().replace(/^["'""«»]|["'""«»]$/g, "");
        } catch {
          // Title generation is non-critical — skip silently
        }
      }

      // Update conversation timestamp (and title if generated)
      await prisma.chatConversation.update({
        where: { id: conversationId },
        data: {
          updatedAt: new Date(),
          ...(generatedTitle ? { title: generatedTitle } : {}),
        },
      });

      await logApiUsage({
        userId,
        feature: "CHAT_RESPONSE",
        model: MODELS.STANDARD,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        durationMs: Date.now() - start,
      });
    },
  });

  return result.toTextStreamResponse();
}
