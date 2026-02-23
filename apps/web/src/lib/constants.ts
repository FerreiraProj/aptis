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
    exportEnabled: true,
    examSimulator: true,
    studyPlan: true,
    advancedAnalytics: true,
    offlineMode: true,
    teacherDashboard: true,
  },
} as const;

export type PlanKey = keyof typeof PLAN_LIMITS;

export const MAX_FILE_SIZE_MB = 50;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const SUPPORTED_FILE_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const FLASHCARD_REVIEW_BATCH_SIZE = 20;
