import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@aptis/database";
import { requireAuth, isAuthError } from "@/lib/auth/guards";
import { failStaleDocuments } from "@/lib/document-processing/pipeline";

type Params = { params: Promise<{ id: string }> };

// GET /api/documents/[id]
export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  const { id } = await params;

  await failStaleDocuments(auth.user.id);

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

// PATCH /api/documents/[id] — toggle archive or update subjectId
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const { isArchived, subjectId } = body as {
    isArchived?: boolean;
    subjectId?: string | null;
  };

  const document = await prisma.document.findFirst({
    where: { id, userId: auth.user.id },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // The subject must belong to the same user
  if (subjectId) {
    const subject = await prisma.subject.findFirst({
      where: { id: subjectId, userId: auth.user.id },
      select: { id: true },
    });
    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }
  }

  const updated = await prisma.document.update({
    where: { id },
    data: {
      ...(isArchived !== undefined && { isArchived }),
      ...(subjectId !== undefined && { subjectId: subjectId || null }),
    },
    select: { id: true, isArchived: true, subjectId: true },
  });

  return NextResponse.json({ document: updated });
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
