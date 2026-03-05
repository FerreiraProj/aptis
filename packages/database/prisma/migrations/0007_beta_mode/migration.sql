-- CreateEnum
CREATE TYPE "BetaStudyLevel" AS ENUM ('SECONDARY', 'UNIVERSITY', 'EXAM_PREP', 'OTHER');

-- CreateEnum
CREATE TYPE "BetaFeedbackCommitment" AS ENUM ('YES', 'YES_DETAILED', 'JUST_TRY');

-- CreateEnum
CREATE TYPE "BetaApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "site_config" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "beta_mode_enabled" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beta_applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "study_level" "BetaStudyLevel" NOT NULL,
    "disciplines" TEXT NOT NULL,
    "feedback_commitment" "BetaFeedbackCommitment" NOT NULL,
    "status" "BetaApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "reviewed_by_admin_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beta_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "beta_applications_email_key" ON "beta_applications"("email");

-- CreateIndex
CREATE INDEX "beta_applications_status_idx" ON "beta_applications"("status");

-- AddForeignKey
ALTER TABLE "beta_applications" ADD CONSTRAINT "beta_applications_reviewed_by_admin_id_fkey"
    FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
