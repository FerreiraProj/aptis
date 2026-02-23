import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@aptis/database";
import { requireAuth, isAuthError } from "@/lib/auth/guards";
import { FLASHCARD_REVIEW_BATCH_SIZE } from "@/lib/constants";

// GET /api/flashcards/due — Get cards due for review today
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    parseInt(searchParams.get("limit") || String(FLASHCARD_REVIEW_BATCH_SIZE)),
    50
  );
  const documentId = searchParams.get("documentId");

  const now = new Date();

  const flashcards = await prisma.flashcard.findMany({
    where: {
      userId: auth.user.id,
      smDueDate: { lte: now },
      ...(documentId ? { documentId } : {}),
    },
    orderBy: { smDueDate: "asc" },
    take: limit,
  });

  const totalDue = await prisma.flashcard.count({
    where: {
      userId: auth.user.id,
      smDueDate: { lte: now },
    },
  });

  return NextResponse.json({ flashcards, totalDue });
}
