-- Migration: 0005_affiliate_discount_system
-- Adds enums, tables and indexes for the referral/affiliate/discount feature.

-- ─── Enums ───────────────────────────────────────────────────────────────────

CREATE TYPE "DiscountType" AS ENUM ('EARLY_ADOPTER', 'LOYALTY');

CREATE TYPE "CommissionType" AS ENUM ('FIXED_EUR', 'PERCENTAGE');

CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'PAID', 'CANCELED');

-- ─── discount_config ─────────────────────────────────────────────────────────

CREATE TABLE "discount_config" (
  "id"                        UUID         NOT NULL DEFAULT gen_random_uuid(),
  "referral_discount_pct"     INTEGER      NOT NULL DEFAULT 20,
  "early_adopter_discount_pct" INTEGER     NOT NULL DEFAULT 30,
  "loyalty_discount_pct"      INTEGER      NOT NULL DEFAULT 25,
  "updated_at"                TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT "discount_config_pkey" PRIMARY KEY ("id")
);

-- ─── referral_codes ──────────────────────────────────────────────────────────

CREATE TABLE "referral_codes" (
  "id"              UUID         NOT NULL DEFAULT gen_random_uuid(),
  "user_id"         UUID         NOT NULL,
  "code"            TEXT         NOT NULL,
  "pending_months"  INTEGER      NOT NULL DEFAULT 0,
  "applied_months"  INTEGER      NOT NULL DEFAULT 0,
  "created_at"      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "referral_codes_user_id_key" ON "referral_codes"("user_id");
CREATE UNIQUE INDEX "referral_codes_code_key"    ON "referral_codes"("code");

ALTER TABLE "referral_codes"
  ADD CONSTRAINT "referral_codes_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- ─── referral_uses ───────────────────────────────────────────────────────────

CREATE TABLE "referral_uses" (
  "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
  "referral_code_id" UUID         NOT NULL,
  "referred_user_id" UUID         NOT NULL,
  "stripe_sub_id"    TEXT,
  "converted_at"     TIMESTAMPTZ,
  "credited_at"      TIMESTAMPTZ,
  "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT "referral_uses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "referral_uses_referral_code_id_referred_user_id_key"
    UNIQUE ("referral_code_id", "referred_user_id")
);

CREATE INDEX "referral_uses_referred_user_id_idx" ON "referral_uses"("referred_user_id");

ALTER TABLE "referral_uses"
  ADD CONSTRAINT "referral_uses_referral_code_id_fkey"
  FOREIGN KEY ("referral_code_id") REFERENCES "referral_codes"("id") ON DELETE CASCADE;

ALTER TABLE "referral_uses"
  ADD CONSTRAINT "referral_uses_referred_user_id_fkey"
  FOREIGN KEY ("referred_user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- ─── user_discounts ──────────────────────────────────────────────────────────

CREATE TABLE "user_discounts" (
  "id"                  UUID           NOT NULL DEFAULT gen_random_uuid(),
  "user_id"             UUID           NOT NULL,
  "type"                "DiscountType" NOT NULL,
  "discount_pct"        INTEGER        NOT NULL,
  "stripe_coupon_id"    TEXT,
  "granted_by_admin_id" UUID           NOT NULL,
  "granted_at"          TIMESTAMPTZ    NOT NULL DEFAULT now(),
  "revoked_at"          TIMESTAMPTZ,
  "revoke_reason"       TEXT,

  CONSTRAINT "user_discounts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_discounts_user_id_idx" ON "user_discounts"("user_id");
CREATE INDEX "user_discounts_type_idx"    ON "user_discounts"("type");

-- Partial unique index: at most one active grant per (user, type)
CREATE UNIQUE INDEX "user_discounts_active_uidx"
  ON "user_discounts"("user_id", "type")
  WHERE "revoked_at" IS NULL;

ALTER TABLE "user_discounts"
  ADD CONSTRAINT "user_discounts_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "user_discounts"
  ADD CONSTRAINT "user_discounts_granted_by_admin_id_fkey"
  FOREIGN KEY ("granted_by_admin_id") REFERENCES "users"("id") ON DELETE RESTRICT;

-- ─── affiliate_partners ──────────────────────────────────────────────────────

CREATE TABLE "affiliate_partners" (
  "id"                   UUID             NOT NULL DEFAULT gen_random_uuid(),
  "name"                 TEXT             NOT NULL,
  "email"                TEXT             NOT NULL,
  "code"                 TEXT             NOT NULL,
  "commission_type"      "CommissionType" NOT NULL,
  "commission_value"     INTEGER          NOT NULL,
  "recurring_months"     INTEGER          NOT NULL DEFAULT 0,
  "is_active"            BOOLEAN          NOT NULL DEFAULT true,
  "notes"                TEXT,
  "created_by_admin_id"  UUID             NOT NULL,
  "created_at"           TIMESTAMPTZ      NOT NULL DEFAULT now(),
  "updated_at"           TIMESTAMPTZ      NOT NULL DEFAULT now(),

  CONSTRAINT "affiliate_partners_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "affiliate_partners_email_key" ON "affiliate_partners"("email");
CREATE UNIQUE INDEX "affiliate_partners_code_key"  ON "affiliate_partners"("code");

ALTER TABLE "affiliate_partners"
  ADD CONSTRAINT "affiliate_partners_created_by_admin_id_fkey"
  FOREIGN KEY ("created_by_admin_id") REFERENCES "users"("id") ON DELETE RESTRICT;

-- ─── affiliate_referrals ─────────────────────────────────────────────────────

CREATE TABLE "affiliate_referrals" (
  "id"               UUID             NOT NULL DEFAULT gen_random_uuid(),
  "partner_id"       UUID             NOT NULL,
  "referred_user_id" UUID             NOT NULL,
  "stripe_sub_id"    TEXT,
  "commission_type"  "CommissionType" NOT NULL,
  "commission_value" INTEGER          NOT NULL,
  "recurring_months" INTEGER          NOT NULL,
  "payments_tracked" INTEGER          NOT NULL DEFAULT 0,
  "converted_at"     TIMESTAMPTZ,
  "canceled_at"      TIMESTAMPTZ,
  "created_at"       TIMESTAMPTZ      NOT NULL DEFAULT now(),
  "updated_at"       TIMESTAMPTZ      NOT NULL DEFAULT now(),

  CONSTRAINT "affiliate_referrals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "affiliate_referrals_partner_id_referred_user_id_key"
    UNIQUE ("partner_id", "referred_user_id")
);

CREATE INDEX "affiliate_referrals_partner_id_idx"       ON "affiliate_referrals"("partner_id");
CREATE INDEX "affiliate_referrals_referred_user_id_idx" ON "affiliate_referrals"("referred_user_id");

ALTER TABLE "affiliate_referrals"
  ADD CONSTRAINT "affiliate_referrals_partner_id_fkey"
  FOREIGN KEY ("partner_id") REFERENCES "affiliate_partners"("id") ON DELETE RESTRICT;

ALTER TABLE "affiliate_referrals"
  ADD CONSTRAINT "affiliate_referrals_referred_user_id_fkey"
  FOREIGN KEY ("referred_user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- ─── affiliate_commissions ───────────────────────────────────────────────────

CREATE TABLE "affiliate_commissions" (
  "id"                UUID               NOT NULL DEFAULT gen_random_uuid(),
  "referral_id"       UUID               NOT NULL,
  "amount_cents"      INTEGER            NOT NULL,
  "status"            "CommissionStatus" NOT NULL DEFAULT 'PENDING',
  "stripe_invoice_id" TEXT,
  "paid_at"           TIMESTAMPTZ,
  "paid_by_admin_id"  UUID,
  "notes"             TEXT,
  "created_at"        TIMESTAMPTZ        NOT NULL DEFAULT now(),

  CONSTRAINT "affiliate_commissions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "affiliate_commissions_referral_id_idx" ON "affiliate_commissions"("referral_id");
CREATE INDEX "affiliate_commissions_status_idx"      ON "affiliate_commissions"("status");

ALTER TABLE "affiliate_commissions"
  ADD CONSTRAINT "affiliate_commissions_referral_id_fkey"
  FOREIGN KEY ("referral_id") REFERENCES "affiliate_referrals"("id") ON DELETE CASCADE;

ALTER TABLE "affiliate_commissions"
  ADD CONSTRAINT "affiliate_commissions_paid_by_admin_id_fkey"
  FOREIGN KEY ("paid_by_admin_id") REFERENCES "users"("id") ON DELETE SET NULL;
