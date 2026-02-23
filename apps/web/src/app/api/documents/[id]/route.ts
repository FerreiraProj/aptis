import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@aptis/database";
import { requireAuth, isAuthError } from "@/lib/auth/guards";

type Params = { params: Promise<{ id: string }> };

// GET /api/documents/[id]
export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  const { id } = await params;

  const document = await prisma.document.findFirst({
    where: { id, userId: auth.user.id },
    include: {
      _count: {
        select: { flashcards: true, quizzes: true, chunks: true },
      },
    },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  return NextResponse.json({ document });
}

// DELETE /api/documents/[id]
export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  const { id } = await params;

  const document = await prisma.document.findFirst({
    where: { id, userId: auth.user.id },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Cascade delete handles related records
  await prisma.document.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
