-- CreateEnum
CREATE TYPE "UsageEventKind" AS ENUM ('DOCUMENT_UPLOAD', 'CHAT_MESSAGE');

-- CreateTable
CREATE TABLE "usage_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "kind" "UsageEventKind" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "usage_events_user_id_kind_created_at_idx" ON "usage_events"("user_id", "kind", "created_at");

-- AddForeignKey
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Idempotent affiliate commissions: one commission per Stripe invoice.
-- NOTE: fails if duplicate stripe_invoice_id rows already exist. Check first with:
--   SELECT stripe_invoice_id, COUNT(*) FROM affiliate_commissions
--   WHERE stripe_invoice_id IS NOT NULL GROUP BY 1 HAVING COUNT(*) > 1;
CREATE UNIQUE INDEX "affiliate_commissions_stripe_invoice_id_key" ON "affiliate_commissions"("stripe_invoice_id");
