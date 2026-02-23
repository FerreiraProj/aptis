import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@aptis/database";
import { requireAuth, isAuthError } from "@/lib/auth/guards";
import { checkRateLimit } from "@/lib/rate-limit";
import { handleChatMessage } from "@/lib/ai/chat-handler";
import type { CoreMessage } from "ai";
import type { MessageRole } from "@aptis/database";

type Params = { params: Promise<{ conversationId: string }> };

// GET /api/chat/[conversationId] — Get conversation + messages
export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  const { conversationId } = await params;

  const conversation = await prisma.chatConversation.findFirst({
    where: { id: conversationId, userId: auth.user.id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 100, // limit history for performance
      },
    },
  });

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ conversation });
}

// POST /api/chat/[conversationId] — Send message (streaming)
export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  // Rate limit chat
  const rateLimit = await checkRateLimit("chat", auth.user.id);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 }
    );
  }

  const { conversationId } = await params;

  const conversation = await prisma.chatConversation.findFirst({
    where: { id: conversationId, userId: auth.user.id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 20, // last 20 messages for context
      },
    },
  });

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }

  const body = await request.json();
  const { message: userMessage } = body;

  if (!userMessage || typeof userMessage !== "string") {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  // Get user preferences
  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { preferredExplanationStyle: true },
  });

  // Build message history for the AI
  const history: CoreMessage[] = conversation.messages
    .filter((m) => m.role !== "SYSTEM")
    .map((m) => ({
      role: (m.role === "USER" ? "user" : "assistant") as "user" | "assistant",
      content: m.content,
    }));

  return handleChatMessage({
    conversationId,
    userId: auth.user.id,
    userMessage,
    documentIds: conversation.documentIds,
    history,
    explanationStyle: user?.preferredExplanationStyle || "CONCISE",
  });
}

// DELETE /api/chat/[conversationId] — Delete conversation
export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  const { conversationId } = await params;

  const conversation = await prisma.chatConversation.findFirst({
    where: { id: conversationId, userId: auth.user.id },
  });

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }

  await prisma.chatConversation.delete({ where: { id: conversationId } });

  return NextResponse.json({ success: true });
}
