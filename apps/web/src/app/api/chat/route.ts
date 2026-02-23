import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@aptis/database";
import { requireAuth, isAuthError } from "@/lib/auth/guards";

// POST /api/chat — Create a new conversation
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  const body = await request.json();
  const { title, documentIds = [] } = body;

  const conversation = await prisma.chatConversation.create({
    data: {
      userId: auth.user.id,
      title: title || null,
      documentIds,
      knownWeaknesses: [],
    },
  });

  return NextResponse.json({ conversation }, { status: 201 });
}

// GET /api/chat — List conversations
export async function GET(_request: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  const conversations = await prisma.chatConversation.findMany({
    where: { userId: auth.user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      documentIds: true,
      knownWeaknesses: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json({ conversations });
}
