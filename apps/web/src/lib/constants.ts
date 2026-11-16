/**
 * Plan limits enforced at API route level.
 * Infinity means unlimited.
 */
export const PLAN_LIMITS = {
  FREE: {
    documentsPerMonth: 1,
    flashcardsPerDocument: 20,
    quizzesPerDocument: 10,
    chatMessagesPerMonth: 50,
    subjectsMax: 1,
    exportEnabled: false,
    examSimulator: false,
    studyPlan: false,
    advancedAnalytics: false,
    offlineMode: false,
    teacherDashboard: false,
  },
  PRO: {
    documentsPerMonth: Infinity,
    flashcardsPerDocument: 100,
    quizzesPerDocument: 50,
    chatMessagesPerMonth: Infinity,
    subjectsMax: 3,
    exportEnabled: true,
    examSimulator: true,
    studyPlan: true,
    advancedAnalytics: false,
    offlineMode: false,
    teacherDashboard: false,
  },
  PREMIUM: {
    documentsPerMonth: Infinity,
    flashcardsPerDocument: Infinity,
    quizzesPerDocument: Infinity,
    chatMessagesPerMonth: Infinity,
    subjectsMax: 10,
    exportEnabled: true,
    examSimulator: true,
    studyPlan: true,
    advancedAnalytics: true,
    offlineMode: true,
    teacherDashboard: false,
  },
  INSTITUTIONAL: {
    documentsPerMonth: Infinity,
    flashcardsPerDocument: Infinity,
    quizzesPerDocument: Infinity,
    chatMessagesPerMonth: Infinity,
    subjectsMax: Infinity,
    exportEnabled: true,
    examSimulator: true,
    studyPlan: true,
    advancedAnalytics: true,
    offlineMode: true,
    teacherDashboard: true,
  },
} as const;

export type PlanKey = keyof typeof PLAN_LIMITS;

/**
 * Rate limits per plan tier, enforced via Upstash Redis.
 *
 * null  = unlimited (no rate limit applied)
 * The window string format is "@upstash/ratelimit" Duration: "N s|m|h|d"
 *
 * Adjust these values to change limits for all users on a given plan.
 * Changes take effect on the next server start (no DB needed).
 */
export const PLAN_RATE_LIMITS = {
  FREE: {
    generate:  { requests: 5,   window: "1 h" }, // AI generation (flashcards/quiz)
    chat:      { requests: 20,  window: "1 h" }, // Chat messages
    upload:    { requests: 3,   window: "1 d" }, // Document uploads
    studyPlan: { requests: 1,   window: "1 d" }, // Study plan generation
    grade:     { requests: 30,  window: "1 h" }, // AI grading of open answers
  },
  PRO: {
    generate:  { requests: 30,  window: "1 h" },
    chat:      { requests: 60,  window: "1 h" },
    upload:    { requests: 20,  window: "1 d" },
    studyPlan: { requests: 5,   window: "1 d" },
    grade:     { requests: 200, window: "1 h" },
  },
  PREMIUM: {
    generate:  { requests: 100, window: "1 h" },
    chat:      { requests: 200, window: "1 h" },
    upload:    { requests: 50,  window: "1 d" },
    studyPlan: { requests: 10,  window: "1 d" },
    grade:     { requests: 500, window: "1 h" },
  },
  INSTITUTIONAL: {
    generate:  null, // unlimited
    chat:      null,
    upload:    null,
    studyPlan: null,
    grade:     null,
  },
} as const satisfies Record<
  PlanKey,
  Record<string, { requests: number; window: string } | null>
>;

export type RateLimitAction = keyof (typeof PLAN_RATE_LIMITS)["FREE"];

export const MAX_FILE_SIZE_MB = 50;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const SUPPORTED_FILE_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Note: "application/vnd.ms-powerpoint" (.ppt old binary format) is NOT supported —
  // officeparser only handles .pptx (OOXML). Users must convert .ppt → .pptx first.
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const FLASHCARD_REVIEW_BATCH_SIZE = 20;

/**
 * Technical ceilings for a single AI generation request, applied when a plan
 * allows "unlimited" (Infinity) items per document.
 */
export const MAX_QUESTIONS_PER_GENERATION = 100;
export const MAX_FLASHCARDS_PER_GENERATION = 200;
