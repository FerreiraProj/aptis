-- CreateTable: subjects
CREATE TABLE "subjects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '📚',
    "color" TEXT NOT NULL DEFAULT '#0ea5e9',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subjects_user_id_idx" ON "subjects"("user_id");

-- AddForeignKey: subjects.user_id → users.id
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: add subject_id to documents
ALTER TABLE "documents" ADD COLUMN "subject_id" UUID;

-- CreateIndex
CREATE INDEX "documents_subject_id_idx" ON "documents"("subject_id");

-- AddForeignKey: documents.subject_id → subjects.id
ALTER TABLE "documents" ADD CONSTRAINT "documents_subject_id_fkey"
    FOREIGN KEY ("subject_id") REFERENCES "subjects"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
