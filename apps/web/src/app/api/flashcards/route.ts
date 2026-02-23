import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@aptis/database";
import { requireAuth, isAuthError } from "@/lib/auth/guards";

// GET /api/flashcards
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get("documentId");
  const topic = searchParams.get("topic");

  const flashcards = await prisma.flashcard.findMany({
    where: {
      userId: auth.user.id,
      ...(documentId ? { documentId } : {}),
      ...(topic ? { topic } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ flashcards });
}

// POST /api/flashcards — Create a manual flashcard
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  const body = await request.json();
  const { front, back, hint, topic, difficulty, tags, documentId } = body;

  if (!front || !back) {
    return NextResponse.json(
      { error: "front and back are required" },
      { status: 400 }
    );
  }

  const flashcard = await prisma.flashcard.create({
    data: {
      userId: auth.user.id,
      documentId: documentId || null,
      front,
      back,
      hint,
      topic,
      difficulty: difficulty || "MEDIUM",
      tags: tags || [],
      isGenerated: false,
    },
  });

  return NextResponse.json({ flashcard }, { status: 201 });
}
