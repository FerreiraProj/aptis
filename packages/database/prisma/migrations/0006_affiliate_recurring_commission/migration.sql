-- Migration: 0006_affiliate_recurring_commission
-- Adds separate recurring commission type/value to affiliate_partners and affiliate_referrals.
-- Both columns are nullable: NULL means "use the same as the initial commission".

ALTER TABLE "affiliate_partners"
  ADD COLUMN "recurring_commission_type"  "CommissionType",
  ADD COLUMN "recurring_commission_value" INTEGER;

ALTER TABLE "affiliate_referrals"
  ADD COLUMN "recurring_commission_type"  "CommissionType",
  ADD COLUMN "recurring_commission_value" INTEGER;
