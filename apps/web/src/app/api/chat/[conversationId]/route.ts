import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@aptis/database";
import { requireAuth, isAuthError } from "@/lib/auth/guards";
import { checkRateLimit, getUserPlan } from "@/lib/rate-limit";
import { handleChatMessage } from "@/lib/ai/chat-handler";
import type { ModelMessage } from "ai";
import {
  checkMonthlyQuota,
  quotaExceededResponse,
  recordUsage,
} from "@/lib/usage";

/** Hard cap on a single user message (keeps prompt cost predictable). */
const MAX_MESSAGE_CHARS = 4000;

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

  // Rate limit chat (plan-aware)
  const plan = await getUserPlan(auth.user.id);
  const rateLimit = await checkRateLimit("chat", auth.user.id, plan);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 }
    );
  }

  // Monthly message quota (PLAN_LIMITS.chatMessagesPerMonth)
  const quota = await checkMonthlyQuota(auth.user.id, plan, "chatMessagesPerMonth");
  if (!quota.allowed) return quotaExceededResponse("chatMessagesPerMonth", quota);

  const { conversationId } = await params;

  const conversation = await prisma.chatConversation.findFirst({
    where: { id: conversationId, userId: auth.user.id },
    include: {
      messages: {
        // Newest first so `take` keeps the LAST 20 messages; reversed below.
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }

  const body = await request.json().catch(() => null);
  const userMessage: unknown = body?.message;
  const subjectName: unknown = body?.subjectName;

  if (typeof userMessage !== "string" || !userMessage.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }
  if (userMessage.length > MAX_MESSAGE_CHARS) {
    return NextResponse.json(
      { error: `Message too long (max ${MAX_MESSAGE_CHARS} characters)` },
      { status: 400 }
    );
  }

  await recordUsage(auth.user.id, "chatMessagesPerMonth");

  // Get user preferences
  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { preferredExplanationStyle: true },
  });

  // Build message history for the AI
  const history: ModelMessage[] = [...conversation.messages]
    .reverse() // back to chronological order
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
    subjectName:
      typeof subjectName === "string" && subjectName.trim()
        ? subjectName.trim().slice(0, 100)
        : undefined,
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
