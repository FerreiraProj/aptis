import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@aptis/database";
import { requireAuth, isAuthError } from "@/lib/auth/guards";
import { checkRateLimit, getUserPlan } from "@/lib/rate-limit";
import {
  processDocument,
  failStaleDocuments,
} from "@/lib/document-processing/pipeline";
import { extractVideoId } from "@/lib/document-processing/youtube-transcriber";
import { MAX_FILE_SIZE_BYTES } from "@/lib/constants";
import {
  detectUploadType,
  legacyOfficeFormat,
} from "@/lib/document-processing/file-types";
import {
  checkMonthlyQuota,
  quotaExceededResponse,
  recordUsage,
} from "@/lib/usage";

// Text extraction + OCR + embeddings run after the response is sent (via `after`),
// but still inside this function invocation — so it needs a generous time budget.
export const maxDuration = 300;

// GET /api/documents — List user's documents
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  await failStaleDocuments(auth.user.id);

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
  const userId = auth.user.id;

  // Rate limit: plan-aware upload limits
  const plan = await getUserPlan(userId);
  const rateLimit = await checkRateLimit("upload", userId, plan);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      {
        status: 429,
        headers: { "X-RateLimit-Reset": String(rateLimit.reset) },
      }
    );
  }

  // Monthly document quota (PLAN_LIMITS.documentsPerMonth)
  const quota = await checkMonthlyQuota(userId, plan, "documentsPerMonth");
  if (!quota.allowed) return quotaExceededResponse("documentsPerMonth", quota);

  const contentType = request.headers.get("content-type") || "";

  // Handle YouTube URL (JSON body)
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => null);
    const youtubeUrl: unknown = body?.youtubeUrl;
    const title: unknown = body?.title;

    if (typeof youtubeUrl !== "string" || !extractVideoId(youtubeUrl)) {
      return NextResponse.json(
        { error: "A valid YouTube URL is required" },
        { status: 400 }
      );
    }

    const document = await prisma.document.create({
      data: {
        userId,
        title:
          typeof title === "string" && title.trim()
            ? title.trim().slice(0, 300)
            : "YouTube Video",
        sourceType: "YOUTUBE",
        youtubeUrl,
        status: "PENDING",
      },
    });
    await recordUsage(userId, "documentsPerMonth");

    after(() =>
      processDocument({
        documentId: document.id,
        userId,
        youtubeUrl,
        sourceType: "YOUTUBE",
      }).catch((err) => console.error("YouTube processing failed:", err))
    );

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

  const detected = detectUploadType(file.name, file.type);
  if (!detected) {
    const legacy = legacyOfficeFormat(file.name, file.type);
    return NextResponse.json(
      {
        error: legacy
          ? `Old .${legacy} files are not supported. Save the file as .${legacy}x and upload it again.`
          : "Unsupported file type",
        ...(legacy ? { code: "LEGACY_OFFICE_FORMAT", format: legacy } : {}),
      },
      { status: 415 }
    );
  }
  const { sourceType, mimeType } = detected;

  // The subject must belong to the uploading user
  if (subjectId) {
    const subject = await prisma.subject.findFirst({
      where: { id: subjectId, userId },
      select: { id: true },
    });
    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }
  }

  // Upload to Supabase Storage temporarily
  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = await createAdminClient();
  const storagePath = `${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(process.env.SUPABASE_STORAGE_BUCKET || "uploads")
    .upload(storagePath, arrayBuffer, { contentType: mimeType });

  if (uploadError) {
    console.error("[documents/upload] Supabase Storage error:", uploadError);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }

  // Create document record
  const document = await prisma.document.create({
    data: {
      userId,
      title: title || file.name,
      sourceType,
      originalName: file.name,
      mimeType,
      sizeBytes: file.size,
      status: "PENDING",
      ...(subjectId ? { subjectId } : {}),
    },
  });
  await recordUsage(userId, "documentsPerMonth");

  // Process after the response is sent. `after` keeps the serverless
  // function alive until processing finishes (bounded by maxDuration).
  after(() =>
    processDocument({
      documentId: document.id,
      userId,
      storagePath,
      sourceType,
      mimeType,
    }).catch((err) => console.error("Document processing failed:", err))
  );

  return NextResponse.json({ document }, { status: 201 });
}
