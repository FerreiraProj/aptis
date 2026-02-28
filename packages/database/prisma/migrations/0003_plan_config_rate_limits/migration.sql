-- Create plan_configs table
CREATE TABLE "plan_configs" (
  "id"                     UUID NOT NULL DEFAULT gen_random_uuid(),
  "plan"                   "PlanTier" NOT NULL,
  "name"                   TEXT NOT NULL,
  "description"            TEXT,
  "price_monthly"          INTEGER NOT NULL DEFAULT 0,
  "price_yearly"           INTEGER NOT NULL DEFAULT 0,
  "promo_price_monthly"    INTEGER,
  "promo_price_yearly"     INTEGER,
  "currency"               TEXT NOT NULL DEFAULT 'EUR',
  "stripe_price_id_monthly" TEXT,
  "stripe_price_id_yearly"  TEXT,
  "features"               TEXT[] NOT NULL DEFAULT '{}',
  "is_public"              BOOLEAN NOT NULL DEFAULT true,
  "trial_days"             INTEGER NOT NULL DEFAULT 7,
  "updated_at"             TIMESTAMP(3) NOT NULL,
  CONSTRAINT "plan_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "plan_configs_plan_key" ON "plan_configs"("plan");

-- Create rate_limit_configs table
CREATE TABLE "rate_limit_configs" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "plan"         "PlanTier" NOT NULL,
  "action"       TEXT NOT NULL,
  "requests"     INTEGER NOT NULL DEFAULT 10,
  "window"       TEXT NOT NULL DEFAULT '1 h',
  "is_unlimited" BOOLEAN NOT NULL DEFAULT false,
  "updated_at"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "rate_limit_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rate_limit_configs_plan_action_key" ON "rate_limit_configs"("plan", "action");
