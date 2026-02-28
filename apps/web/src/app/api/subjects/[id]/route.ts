import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@aptis/database";
import { requireAuth, isAuthError } from "@/lib/auth/guards";

// PUT /api/subjects/[id] — update a subject
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  const { id } = await params;
  const existing = await prisma.subject.findUnique({ where: { id } });

  if (!existing || existing.userId !== auth.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const { name, emoji, color, description } = body as {
    name?: string;
    emoji?: string;
    color?: string;
    description?: string | null;
  };

  if (name !== undefined && !name.trim()) {
    return NextResponse.json({ error: "O nome não pode estar vazio" }, { status: 400 });
  }

  const subject = await prisma.subject.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(emoji !== undefined && { emoji }),
      ...(color !== undefined && { color }),
      ...(description !== undefined && { description: description?.trim() || null }),
    },
    include: { _count: { select: { documents: true } } },
  });

  return NextResponse.json({ subject });
}

// DELETE /api/subjects/[id] — delete a subject (documents become uncategorized)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  const { id } = await params;
  const existing = await prisma.subject.findUnique({ where: { id } });

  if (!existing || existing.userId !== auth.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.subject.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
