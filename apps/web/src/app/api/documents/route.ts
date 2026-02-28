import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@aptis/database";
import { requireAuth, isAuthError } from "@/lib/auth/guards";
import { checkRateLimit, getUserPlan } from "@/lib/rate-limit";
import { processDocument } from "@/lib/document-processing/pipeline";
import { MAX_FILE_SIZE_BYTES, SUPPORTED_FILE_TYPES } from "@/lib/constants";
import type { SourceType } from "@aptis/database";

// GET /api/documents — List user's documents
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const archived = searchParams.get("archived"); // "true" = archived only; default = active only

  const documents = await prisma.document.findMany({
    where: {
      userId: auth.user.id,
      ...(status ? { status: status as never } : {}),
      isArchived: archived === "true",
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      sourceType: true,
      status: true,
      wordCount: true,
      pageCount: true,
      topics: true,
      subject: true,
      subjectId: true,
      createdAt: true,
      discipline: { select: { name: true, emoji: true, color: true } },
      _count: {
        select: { flashcards: true, quizzes: true },
      },
    },
  });

  return NextResponse.json({ documents });
}

// POST /api/documents — Upload and process a document
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  // Rate limit: plan-aware upload limits
  const plan = await getUserPlan(auth.user.id);
  const rateLimit = await checkRateLimit("upload", auth.user.id, plan);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      {
        status: 429,
        headers: { "X-RateLimit-Reset": String(rateLimit.reset) },
      }
    );
  }

  const contentType = request.headers.get("content-type") || "";

  // Handle YouTube URL (JSON body)
  if (contentType.includes("application/json")) {
    const body = await request.json();
    const { youtubeUrl, title } = body;

    if (!youtubeUrl || typeof youtubeUrl !== "string") {
      return NextResponse.json(
        { error: "youtubeUrl is required" },
        { status: 400 }
      );
    }

    const document = await prisma.document.create({
      data: {
        userId: auth.user.id,
        title: title || "YouTube Video",
        sourceType: "YOUTUBE",
        youtubeUrl,
        status: "PENDING",
      },
    });

    // Process asynchronously (don't await)
    processDocument({
      documentId: document.id,
      userId: auth.user.id,
      youtubeUrl,
      sourceType: "YOUTUBE",
    }).catch((err) => console.error("YouTube processing failed:", err));

    return NextResponse.json({ document }, { status: 201 });
  }

  // Handle file upload (multipart/form-data)
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Invalid content type" },
      { status: 400 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const title = formData.get("title") as string | null;
  const subjectId = (formData.get("subjectId") as string | null) || null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB` },
      { status: 413 }
    );
  }

  if (!SUPPORTED_FILE_TYPES.includes(file.type as never)) {
    return NextResponse.json(
      { error: "Unsupported file type" },
      { status: 415 }
    );
  }

  // Determine source type
  let sourceType: SourceType = "PDF";
  if (file.type === "text/plain") sourceType = "TEXT";
  else if (file.type.startsWith("image/")) sourceType = "IMAGE";
  else if (
    file.type.includes("presentation") ||
    /\.pptx$/i.test(file.name)
  ) sourceType = "POWERPOINT";

  // Upload to Supabase Storage temporarily
  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = await createAdminClient();
  const storagePath = `${auth.user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(process.env.SUPABASE_STORAGE_BUCKET || "uploads")
    .upload(storagePath, arrayBuffer, { contentType: file.type });

  if (uploadError) {
    console.error("[documents/upload] Supabase Storage error:", uploadError);
    return NextResponse.json(
      { error: "Failed to upload file", detail: uploadError.message },
      { status: 500 }
    );
  }

  // Create document record
  const document = await prisma.document.create({
    data: {
      userId: auth.user.id,
      title: title || file.name,
      sourceType,
      originalName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      status: "PENDING",
      ...(subjectId ? { subjectId } : {}),
    },
  });

  // Process asynchronously
  processDocument({
    documentId: document.id,
    userId: auth.user.id,
    storagePath,
    sourceType,
    mimeType: file.type,
  }).catch((err) => console.error("Document processing failed:", err));

  return NextResponse.json({ document }, { status: 201 });
}
