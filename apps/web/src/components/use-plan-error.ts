"use client";

import { useTranslations } from "next-intl";

type PlanErrorBody = { code?: string; limit?: number } | null | undefined;

/**
 * Maps the plan-limit error codes returned by the API (see lib/usage.ts)
 * to a translated, user-friendly message. Returns null for other errors.
 */
export function usePlanErrorMessage() {
  const t = useTranslations("planGate");

  return (body: PlanErrorBody): string | null => {
    switch (body?.code) {
      case "PLAN_LIMIT_DOCUMENTS":
        return t("limitDocuments", { limit: body.limit ?? 0 });
      case "PLAN_LIMIT_CHAT":
        return t("limitChat", { limit: body.limit ?? 0 });
      case "PLAN_FEATURE_LOCKED":
        return t("featureLocked");
      default:
        return null;
    }
  };
}
