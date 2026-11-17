-- AlterTable: admin-granted plan override (independent of Stripe)
ALTER TABLE "users" ADD COLUMN "plan_override" "PlanTier";
ALTER TABLE "users" ADD COLUMN "plan_override_expires_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "plan_override_granted_at" TIMESTAMP(3);
