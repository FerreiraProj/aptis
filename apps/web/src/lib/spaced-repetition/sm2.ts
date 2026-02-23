import { supermemo, type SuperMemoGrade } from "supermemo";
import type { Flashcard } from "@aptis/database";

/**
 * Simplified grade buttons mapped to SM-2 grades (0-5).
 *
 * AGAIN → 0: Complete blackout — resets interval
 * HARD  → 2: Recalled with serious difficulty
 * GOOD  → 4: Correct after hesitation
 * EASY  → 5: Perfect response
 */
export type ReviewGrade = "AGAIN" | "HARD" | "GOOD" | "EASY";

const GRADE_MAP: Record<ReviewGrade, SuperMemoGrade> = {
  AGAIN: 0,
  HARD: 2,
  GOOD: 4,
  EASY: 5,
};

export interface SM2Result {
  smInterval: number;
  smRepetition: number;
  smEfactor: number;
  smDueDate: Date;
}

/**
 * Calculate the next review state for a flashcard using SM-2.
 */
export function calculateNextReview(
  card: Pick<Flashcard, "smInterval" | "smRepetition" | "smEfactor">,
  grade: ReviewGrade
): SM2Result {
  const smGrade = GRADE_MAP[grade];

  const { interval, repetition, efactor } = supermemo(
    {
      interval: card.smInterval,
      repetition: card.smRepetition,
      efactor: card.smEfactor,
    },
    smGrade
  );

  const smDueDate = new Date();
  smDueDate.setDate(smDueDate.getDate() + interval);
  // Set to start of next day for consistency
  smDueDate.setHours(0, 0, 0, 0);

  return {
    smInterval: interval,
    smRepetition: repetition,
    smEfactor: efactor,
    smDueDate,
  };
}

/**
 * Filter and sort cards due for review today.
 */
export function getDueCards(
  cards: Flashcard[],
  limit: number = 20
): Flashcard[] {
  const now = new Date();
  return cards
    .filter((card) => new Date(card.smDueDate) <= now)
    .sort(
      (a, b) =>
        new Date(a.smDueDate).getTime() - new Date(b.smDueDate).getTime()
    )
    .slice(0, limit);
}

/**
 * Get review statistics for display.
 */
export function getReviewStats(cards: Flashcard[]): {
  dueToday: number;
  dueThisWeek: number;
  mature: number; // interval >= 21 days
  young: number; // interval 1-20 days
  new: number; // never reviewed
} {
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return {
    dueToday: cards.filter((c) => new Date(c.smDueDate) <= now).length,
    dueThisWeek: cards.filter((c) => new Date(c.smDueDate) <= weekFromNow)
      .length,
    mature: cards.filter((c) => c.smInterval >= 21).length,
    young: cards.filter((c) => c.smInterval >= 1 && c.smInterval < 21).length,
    new: cards.filter((c) => c.smRepetition === 0).length,
  };
}
