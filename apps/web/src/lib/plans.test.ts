import { describe, expect, it } from "vitest";
import {
  getGenerationLimits,
  getMonthlyLimit,
  hasFeature,
  resolveEffectivePlan,
  startOfMonthUtc,
} from "./plans";

describe("resolveEffectivePlan", () => {
  it("returns FREE when there is no subscription", () => {
    expect(resolveEffectivePlan(null)).toBe("FREE");
    expect(resolveEffectivePlan(undefined)).toBe("FREE");
  });

  it.each(["ACTIVE", "TRIALING", "PAST_DUE"])("keeps the paid plan while %s", (status) => {
    expect(resolveEffectivePlan({ plan: "PRO", status })).toBe("PRO");
    expect(resolveEffectivePlan({ plan: "PREMIUM", status })).toBe("PREMIUM");
  });

  it.each(["CANCELED", "UNPAID", "INCOMPLETE", "INCOMPLETE_EXPIRED", "PAUSED"])(
    "drops to FREE when %s",
    (status) => {
      expect(resolveEffectivePlan({ plan: "PREMIUM", status })).toBe("FREE");
    }
  );

  it("falls back to FREE for an unknown plan value", () => {
    expect(resolveEffectivePlan({ plan: "GOLD", status: "ACTIVE" })).toBe("FREE");
  });
});

describe("hasFeature", () => {
  it("locks paid features on FREE", () => {
    expect(hasFeature("FREE", "examSimulator")).toBe(false);
    expect(hasFeature("FREE", "studyPlan")).toBe(false);
  });

  it("unlocks them on PRO and above", () => {
    for (const plan of ["PRO", "PREMIUM", "INSTITUTIONAL"] as const) {
      expect(hasFeature(plan, "examSimulator")).toBe(true);
      expect(hasFeature(plan, "studyPlan")).toBe(true);
    }
  });

  it("keeps the teacher dashboard institutional-only", () => {
    expect(hasFeature("PREMIUM", "teacherDashboard")).toBe(false);
    expect(hasFeature("INSTITUTIONAL", "teacherDashboard")).toBe(true);
  });
});

describe("getMonthlyLimit", () => {
  it("limits FREE and leaves paid plans unlimited", () => {
    expect(getMonthlyLimit("FREE", "documentsPerMonth")).toBe(1);
    expect(getMonthlyLimit("FREE", "chatMessagesPerMonth")).toBe(50);
    expect(getMonthlyLimit("PRO", "documentsPerMonth")).toBe(Infinity);
    expect(getMonthlyLimit("PRO", "chatMessagesPerMonth")).toBe(Infinity);
  });
});

describe("getGenerationLimits", () => {
  it("applies the per-plan limits (10/50/100 questions, 20/100/200 flashcards)", () => {
    expect(getGenerationLimits("FREE")).toEqual({ maxQuestions: 10, maxFlashcards: 20 });
    expect(getGenerationLimits("PRO")).toEqual({ maxQuestions: 50, maxFlashcards: 100 });
    expect(getGenerationLimits("PREMIUM")).toEqual({ maxQuestions: 100, maxFlashcards: 200 });
    expect(getGenerationLimits("INSTITUTIONAL")).toEqual({ maxQuestions: 100, maxFlashcards: 200 });
  });
});

describe("startOfMonthUtc", () => {
  it("returns the first instant of the month in UTC", () => {
    const d = startOfMonthUtc(new Date("2026-11-16T15:30:00Z"));
    expect(d.toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });

  it("handles the last moment of a month", () => {
    const d = startOfMonthUtc(new Date("2026-12-31T23:59:59.999Z"));
    expect(d.toISOString()).toBe("2026-12-01T00:00:00.000Z");
  });
});
