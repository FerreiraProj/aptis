import { describe, expect, it } from "vitest";
import { calculateNextReview } from "./sm2";

const NEW_CARD = { smInterval: 0, smRepetition: 0, smEfactor: 2.5 };

function daysFromToday(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86_400_000);
}

describe("calculateNextReview (SM-2)", () => {
  it("schedules a new card for tomorrow after GOOD", () => {
    const r = calculateNextReview(NEW_CARD, "GOOD");
    expect(r.smInterval).toBe(1);
    expect(r.smRepetition).toBe(1);
    expect(daysFromToday(r.smDueDate)).toBe(1);
  });

  it("grows the interval on consecutive successes", () => {
    let card = { ...NEW_CARD };
    const intervals: number[] = [];
    for (let i = 0; i < 4; i++) {
      const r = calculateNextReview(card, "GOOD");
      intervals.push(r.smInterval);
      card = { smInterval: r.smInterval, smRepetition: r.smRepetition, smEfactor: r.smEfactor };
    }
    expect(intervals[0]).toBe(1);
    expect(intervals[1]).toBe(6);
    expect(intervals[2]).toBeGreaterThan(intervals[1]);
    expect(intervals[3]).toBeGreaterThan(intervals[2]);
  });

  it("resets repetitions after AGAIN", () => {
    const mature = { smInterval: 30, smRepetition: 5, smEfactor: 2.5 };
    const r = calculateNextReview(mature, "AGAIN");
    expect(r.smRepetition).toBe(0);
    expect(r.smInterval).toBeLessThanOrEqual(1);
  });

  it("raises the ease factor on EASY and lowers it on HARD", () => {
    const card = { smInterval: 6, smRepetition: 2, smEfactor: 2.5 };
    expect(calculateNextReview(card, "EASY").smEfactor).toBeGreaterThan(2.5);
    expect(calculateNextReview(card, "HARD").smEfactor).toBeLessThan(2.5);
  });

  it("never lets the ease factor drop below 1.3", () => {
    let card = { smInterval: 1, smRepetition: 1, smEfactor: 1.3 };
    for (let i = 0; i < 5; i++) {
      const r = calculateNextReview(card, "AGAIN");
      card = { smInterval: r.smInterval, smRepetition: r.smRepetition, smEfactor: r.smEfactor };
    }
    expect(card.smEfactor).toBeGreaterThanOrEqual(1.3);
  });

  it("sets the due date to midnight", () => {
    const r = calculateNextReview(NEW_CARD, "EASY");
    expect(r.smDueDate.getHours()).toBe(0);
    expect(r.smDueDate.getMinutes()).toBe(0);
  });
});
