import { generateObject } from "ai";
import { z } from "zod";
import { openai, MODELS } from "./client";
import { logApiUsage } from "./usage-logger";

// ─── Schema (OpenAI Structured Outputs — no .optional(), no .default()) ───────

const TaskSchema = z.object({
  taskType: z.enum(["FLASHCARD_REVIEW", "QUIZ", "READING", "CHAT"]),
  title: z.string().describe("Short title, e.g. 'Revisão: Sistema Cardiovascular'"),
  description: z.string().nullable().describe("One-sentence explanation of what to do, or null"),
  durationMin: z.number().describe("Duration in minutes (10-60)"),
  topic: z.string().nullable().describe("Specific topic covered, or null"),
});

const DaySchema = z.object({
  dayNumber: z.number().describe("Day number starting from 1"),
  focus: z.string().describe("Main theme/topic for this day, e.g. 'Anatomia Cardíaca'"),
  tasks: z.array(TaskSchema).describe("2-4 study tasks for this day"),
});

const PlanOutputSchema = z.object({
  title: z.string().describe("Study plan title, e.g. 'Plano de Estudo — Anatomia (3 semanas)'"),
  days: z.array(DaySchema),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type GeneratedStudyPlan = z.infer<typeof PlanOutputSchema>;

export interface GenerateStudyPlanOptions {
  documents: { title: string; topics: string[]; excerpt: string | null; subjectName: string | null }[];
  daysToGenerate: number;
  hoursPerDay: number;
  gradeGoal: string | null;
  studyNiche: string | null;
  userId: string;
}

// ─── Generator ────────────────────────────────────────────────────────────────

export async function generateStudyPlan(
  options: GenerateStudyPlanOptions
): Promise<GeneratedStudyPlan> {
  const {
    documents,
    daysToGenerate,
    hoursPerDay,
    gradeGoal,
    studyNiche,
    userId,
  } = options;

  const minutesPerDay = Math.round(hoursPerDay * 60);

  // Combine titles, topics and real content excerpts from all documents
  const docSummary = documents
    .map((d) => {
      const topics = d.topics.length > 0 ? d.topics.slice(0, 8).join(", ") : "";
      let entry = `• "${d.title}"${d.subjectName ? ` [${d.subjectName}]` : ""}`;
      if (topics) entry += `\n  Tópicos: ${topics}`;
      if (d.excerpt) entry += `\n  Excerto: ${d.excerpt}`;
      return entry;
    })
    .join("\n\n");

  const start = Date.now();

  const { object, usage } = await generateObject({
    model: openai(MODELS.MINI),
    schema: PlanOutputSchema,
    system: `You are an expert study coach creating a personalized study plan for a ${studyNiche ?? "estudante"}.
The plan should be realistic, progressive (easier topics first), and well-balanced.

Guidelines:
- Each day has ${minutesPerDay} minutes available (${hoursPerDay}h/day)
- Mix task types: READING (understand content), FLASHCARD_REVIEW (memorize), QUIZ (test knowledge), CHAT (clarify doubts)
- Progression: start with READING, then FLASHCARD_REVIEW and QUIZ, revisit hard topics at the end
- Days near the exam should focus on FLASHCARD_REVIEW and QUIZ
- Keep task durations realistic: READING 20-45min, FLASHCARD_REVIEW 15-30min, QUIZ 15-25min, CHAT 10-20min
- Distribute topics evenly across days, interleaving content from different documents
- Write all titles and descriptions in Portuguese (pt-PT)`,
    prompt: `Create a ${daysToGenerate}-day study plan covering the following documents:

${docSummary}
${gradeGoal ? `Grade goal: ${gradeGoal}` : ""}
Daily study time: ${minutesPerDay} minutes

Generate exactly ${daysToGenerate} days, each with 2-4 tasks totalling ~${minutesPerDay} minutes.
Interleave content from all documents so each gets adequate coverage.`,
  });

  await logApiUsage({
    userId,
    feature: "STUDY_PLAN_GENERATION",
    model: MODELS.MINI,
    inputTokens: usage.inputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
    durationMs: Date.now() - start,
  });

  return object;
}
