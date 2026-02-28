-- Add isArchived to documents
ALTER TABLE "documents" ADD COLUMN "is_archived" BOOLEAN NOT NULL DEFAULT false;

-- Add documentIds to study_plans
ALTER TABLE "study_plans" ADD COLUMN "document_ids" TEXT[] NOT NULL DEFAULT '{}';
