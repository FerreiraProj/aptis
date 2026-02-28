-- ============================================================
-- APTIS — Full Database Setup
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- WARNING: Drops all existing Aptis tables and rebuilds from scratch
-- ============================================================

-- ─── 1. DROP existing tables (reverse dependency order) ──────

DROP TABLE IF EXISTS api_usage_logs CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_conversations CASCADE;
DROP TABLE IF EXISTS progress_records CASCADE;
DROP TABLE IF EXISTS study_plan_tasks CASCADE;
DROP TABLE IF EXISTS study_plan_days CASCADE;
DROP TABLE IF EXISTS study_plans CASCADE;
DROP TABLE IF EXISTS study_sessions CASCADE;
DROP TABLE IF EXISTS quiz_answers CASCADE;
DROP TABLE IF EXISTS quiz_attempts CASCADE;
DROP TABLE IF EXISTS quiz_options CASCADE;
DROP TABLE IF EXISTS quiz_questions CASCADE;
DROP TABLE IF EXISTS quizzes CASCADE;
DROP TABLE IF EXISTS flashcards CASCADE;
DROP TABLE IF EXISTS document_chunks CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ─── 2. DROP existing enums ───────────────────────────────────

DROP TYPE IF EXISTS "ApiFeature" CASCADE;
DROP TYPE IF EXISTS "MessageRole" CASCADE;
DROP TYPE IF EXISTS "SessionType" CASCADE;
DROP TYPE IF EXISTS "QuestionType" CASCADE;
DROP TYPE IF EXISTS "QuizType" CASCADE;
DROP TYPE IF EXISTS "DifficultyLevel" CASCADE;
DROP TYPE IF EXISTS "DocumentStatus" CASCADE;
DROP TYPE IF EXISTS "SourceType" CASCADE;
DROP TYPE IF EXISTS "PlanTier" CASCADE;
DROP TYPE IF EXISTS "SubscriptionStatus" CASCADE;
DROP TYPE IF EXISTS "ExplanationStyle" CASCADE;
DROP TYPE IF EXISTS "UserRole" CASCADE;

-- ─── 3. EXTENSIONS ───────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── 4. ENUMS ────────────────────────────────────────────────

CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'ADMIN', 'INSTITUTION_ADMIN');
CREATE TYPE "ExplanationStyle" AS ENUM ('CONCISE', 'DETAILED', 'VISUAL', 'ANALOGICAL');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID', 'TRIALING', 'INCOMPLETE', 'INCOMPLETE_EXPIRED', 'PAUSED');
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'PRO', 'PREMIUM', 'INSTITUTIONAL');
CREATE TYPE "SourceType" AS ENUM ('PDF', 'POWERPOINT', 'TEXT', 'YOUTUBE', 'SCREENSHOT', 'IMAGE');
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');
CREATE TYPE "DifficultyLevel" AS ENUM ('EASY', 'MEDIUM', 'HARD');
CREATE TYPE "QuizType" AS ENUM ('MULTIPLE_CHOICE', 'OPEN_ANSWER', 'MIXED', 'EXAM_SIMULATION');
CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'OPEN_ANSWER');
CREATE TYPE "SessionType" AS ENUM ('FLASHCARD_REVIEW', 'QUIZ', 'EXAM_SIMULATION', 'READING', 'CHAT');
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');
CREATE TYPE "ApiFeature" AS ENUM ('FLASHCARD_GENERATION', 'QUIZ_GENERATION', 'SUMMARY_GENERATION', 'CHAT_RESPONSE', 'STUDY_PLAN_GENERATION', 'OPEN_ANSWER_GRADING', 'EMBEDDING_GENERATION');

-- ─── 5. TABLES ───────────────────────────────────────────────

CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT,
    "avatar_url" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
    "exam_date" TIMESTAMP(3),
    "hours_per_day" DOUBLE PRECISION,
    "grade_goal" TEXT,
    "current_level" TEXT,
    "study_niche" TEXT,
    "stripe_customer_id" TEXT,
    "preferred_explanation_style" "ExplanationStyle" NOT NULL DEFAULT 'CONCISE',
    "preferred_locale" TEXT NOT NULL DEFAULT 'pt',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "stripe_subscription_id" TEXT NOT NULL,
    "stripe_price_id" TEXT NOT NULL,
    "stripe_product_id" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "plan" "PlanTier" NOT NULL,
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "canceled_at" TIMESTAMP(3),
    "trial_start" TIMESTAMP(3),
    "trial_end" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "source_type" "SourceType" NOT NULL,
    "original_name" TEXT,
    "mime_type" TEXT,
    "size_bytes" INTEGER,
    "page_count" INTEGER,
    "youtube_url" TEXT,
    "youtube_duration" INTEGER,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "extracted_text" TEXT,
    "word_count" INTEGER,
    "subject" TEXT,
    "topics" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "document_chunks" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "token_count" INTEGER,
    "page_number" INTEGER,
    "embedding" extensions.vector(1536),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "flashcards" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "document_id" UUID,
    "front" TEXT NOT NULL,
    "back" TEXT NOT NULL,
    "hint" TEXT,
    "topic" TEXT,
    "difficulty" "DifficultyLevel" NOT NULL DEFAULT 'MEDIUM',
    "tags" TEXT[],
    "sm_interval" INTEGER NOT NULL DEFAULT 0,
    "sm_repetition" INTEGER NOT NULL DEFAULT 0,
    "sm_efactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "sm_due_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_generated" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "flashcards_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quizzes" (
    "id" UUID NOT NULL,
    "document_id" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "quiz_type" "QuizType" NOT NULL,
    "time_limit" INTEGER,
    "passing_score" INTEGER NOT NULL DEFAULT 70,
    "is_exam_mode" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quiz_questions" (
    "id" UUID NOT NULL,
    "quiz_id" UUID NOT NULL,
    "question_index" INTEGER NOT NULL,
    "question_text" TEXT NOT NULL,
    "question_type" "QuestionType" NOT NULL,
    "explanation" TEXT,
    "difficulty" "DifficultyLevel" NOT NULL DEFAULT 'MEDIUM',
    "topic" TEXT,
    "points" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quiz_options" (
    "id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "option_index" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    CONSTRAINT "quiz_options_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quiz_attempts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "quiz_id" UUID NOT NULL,
    "score" DOUBLE PRECISION,
    "passed" BOOLEAN,
    "time_taken" INTEGER,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quiz_answers" (
    "id" UUID NOT NULL,
    "attempt_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "selected_options" TEXT[],
    "open_response" TEXT,
    "is_correct" BOOLEAN,
    "score" DOUBLE PRECISION,
    "ai_feedback" TEXT,
    "time_spent" INTEGER,
    CONSTRAINT "quiz_answers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "study_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "session_type" "SessionType" NOT NULL,
    "document_id" UUID,
    "duration_seconds" INTEGER,
    "cards_reviewed" INTEGER NOT NULL DEFAULT 0,
    "questions_answered" INTEGER NOT NULL DEFAULT 0,
    "correct_answers" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    CONSTRAINT "study_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "study_plans" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "document_id" UUID,
    "title" TEXT NOT NULL,
    "exam_date" TIMESTAMP(3) NOT NULL,
    "hours_per_day" DOUBLE PRECISION NOT NULL,
    "grade_goal" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "study_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "study_plan_days" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "day_number" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "total_minutes" INTEGER NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "study_plan_days_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "study_plan_tasks" (
    "id" UUID NOT NULL,
    "day_id" UUID NOT NULL,
    "task_type" "SessionType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "duration_min" INTEGER NOT NULL,
    "topic" TEXT,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "task_order" INTEGER NOT NULL,
    CONSTRAINT "study_plan_tasks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "progress_records" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "flashcard_id" UUID NOT NULL,
    "grade" INTEGER NOT NULL,
    "prev_interval" INTEGER NOT NULL,
    "new_interval" INTEGER NOT NULL,
    "prev_efactor" DOUBLE PRECISION NOT NULL,
    "new_efactor" DOUBLE PRECISION NOT NULL,
    "response_time" INTEGER,
    "reviewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "progress_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chat_conversations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT,
    "document_ids" TEXT[],
    "known_weaknesses" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chat_messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "tokens_used" INTEGER,
    "model_used" TEXT,
    "source_chunk_ids" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "api_usage_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "feature" "ApiFeature" NOT NULL,
    "model" TEXT NOT NULL,
    "input_tokens" INTEGER NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "cost_usd" DOUBLE PRECISION NOT NULL,
    "duration_ms" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "api_usage_logs_pkey" PRIMARY KEY ("id")
);

-- ─── 6. INDEXES ──────────────────────────────────────────────

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_stripe_customer_id_key" ON "users"("stripe_customer_id");
CREATE UNIQUE INDEX "subscriptions_user_id_key" ON "subscriptions"("user_id");
CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");
CREATE INDEX "documents_user_id_idx" ON "documents"("user_id");
CREATE INDEX "documents_status_idx" ON "documents"("status");
CREATE INDEX "document_chunks_document_id_chunk_index_idx" ON "document_chunks"("document_id", "chunk_index");
CREATE INDEX "flashcards_user_id_sm_due_date_idx" ON "flashcards"("user_id", "sm_due_date");
CREATE INDEX "flashcards_document_id_idx" ON "flashcards"("document_id");
CREATE INDEX "quizzes_document_id_idx" ON "quizzes"("document_id");
CREATE INDEX "quiz_questions_quiz_id_question_index_idx" ON "quiz_questions"("quiz_id", "question_index");
CREATE INDEX "quiz_attempts_user_id_created_at_idx" ON "quiz_attempts"("user_id", "created_at");
CREATE INDEX "study_sessions_user_id_started_at_idx" ON "study_sessions"("user_id", "started_at");
CREATE INDEX "study_plans_user_id_is_active_idx" ON "study_plans"("user_id", "is_active");
CREATE UNIQUE INDEX "study_plan_days_plan_id_day_number_key" ON "study_plan_days"("plan_id", "day_number");
CREATE INDEX "study_plan_tasks_day_id_task_order_idx" ON "study_plan_tasks"("day_id", "task_order");
CREATE INDEX "progress_records_user_id_reviewed_at_idx" ON "progress_records"("user_id", "reviewed_at");
CREATE INDEX "progress_records_flashcard_id_idx" ON "progress_records"("flashcard_id");
CREATE INDEX "chat_conversations_user_id_idx" ON "chat_conversations"("user_id");
CREATE INDEX "chat_messages_conversation_id_created_at_idx" ON "chat_messages"("conversation_id", "created_at");
CREATE INDEX "api_usage_logs_user_id_created_at_idx" ON "api_usage_logs"("user_id", "created_at");
CREATE INDEX "api_usage_logs_created_at_idx" ON "api_usage_logs"("created_at");
CREATE INDEX "api_usage_logs_feature_idx" ON "api_usage_logs"("feature");

-- HNSW vector index for cosine similarity (RAG search)
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx
  ON document_chunks USING hnsw (embedding extensions.vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ─── 7. FOREIGN KEYS ─────────────────────────────────────────

ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quiz_options" ADD CONSTRAINT "quiz_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "quiz_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quiz_answers" ADD CONSTRAINT "quiz_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "quiz_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quiz_answers" ADD CONSTRAINT "quiz_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "quiz_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "study_plans" ADD CONSTRAINT "study_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "study_plans" ADD CONSTRAINT "study_plans_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "study_plan_days" ADD CONSTRAINT "study_plan_days_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "study_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "study_plan_tasks" ADD CONSTRAINT "study_plan_tasks_day_id_fkey" FOREIGN KEY ("day_id") REFERENCES "study_plan_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "progress_records" ADD CONSTRAINT "progress_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "progress_records" ADD CONSTRAINT "progress_records_flashcard_id_fkey" FOREIGN KEY ("flashcard_id") REFERENCES "flashcards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "api_usage_logs" ADD CONSTRAINT "api_usage_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── 8. SUPABASE AUTH TRIGGER ─────────────────────────────────
-- Syncs new Supabase Auth users → public.users table automatically

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ─── 9. ROW LEVEL SECURITY ────────────────────────────────────

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plan_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Users: own row only
CREATE POLICY "users_own_select" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_own_update" ON users FOR UPDATE USING (auth.uid() = id);

-- Documents
CREATE POLICY "documents_own" ON documents FOR ALL USING (user_id = auth.uid());

-- Document chunks: via document ownership
CREATE POLICY "document_chunks_via_document" ON document_chunks FOR SELECT USING (
  EXISTS (SELECT 1 FROM documents d WHERE d.id = document_id AND d.user_id = auth.uid())
);

-- Flashcards
CREATE POLICY "flashcards_own" ON flashcards FOR ALL USING (user_id = auth.uid());

-- Quizzes
CREATE POLICY "quizzes_own_attempts" ON quizzes FOR SELECT USING (
  EXISTS (SELECT 1 FROM quiz_attempts qa WHERE qa.quiz_id = id AND qa.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM documents d WHERE d.id = document_id AND d.user_id = auth.uid())
  OR document_id IS NULL
);

-- Quiz questions/options
CREATE POLICY "quiz_questions_via_quiz" ON quiz_questions FOR SELECT USING (
  EXISTS (SELECT 1 FROM quizzes q WHERE q.id = quiz_id)
);
CREATE POLICY "quiz_options_via_question" ON quiz_options FOR SELECT USING (true);

-- Quiz attempts & answers
CREATE POLICY "quiz_attempts_own" ON quiz_attempts FOR ALL USING (user_id = auth.uid());
CREATE POLICY "quiz_answers_via_attempt" ON quiz_answers FOR ALL USING (
  EXISTS (SELECT 1 FROM quiz_attempts qa WHERE qa.id = attempt_id AND qa.user_id = auth.uid())
);

-- Study sessions, plans, progress
CREATE POLICY "study_sessions_own" ON study_sessions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "study_plans_own" ON study_plans FOR ALL USING (user_id = auth.uid());
CREATE POLICY "study_plan_days_via_plan" ON study_plan_days FOR ALL USING (
  EXISTS (SELECT 1 FROM study_plans sp WHERE sp.id = plan_id AND sp.user_id = auth.uid())
);
CREATE POLICY "study_plan_tasks_via_day" ON study_plan_tasks FOR ALL USING (
  EXISTS (
    SELECT 1 FROM study_plan_days spd
    JOIN study_plans sp ON sp.id = spd.plan_id
    WHERE spd.id = day_id AND sp.user_id = auth.uid()
  )
);
CREATE POLICY "progress_records_own" ON progress_records FOR ALL USING (user_id = auth.uid());

-- Chat
CREATE POLICY "chat_conversations_own" ON chat_conversations FOR ALL USING (user_id = auth.uid());
CREATE POLICY "chat_messages_via_conversation" ON chat_messages FOR ALL USING (
  EXISTS (SELECT 1 FROM chat_conversations cc WHERE cc.id = conversation_id AND cc.user_id = auth.uid())
);

-- Subscriptions & API logs
CREATE POLICY "subscriptions_own" ON subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "api_usage_logs_own" ON api_usage_logs FOR SELECT USING (user_id = auth.uid());

-- ─── 10. ADMIN USER SETUP ─────────────────────────────────────
-- After running this script, create the admin user via Supabase Auth dashboard:
-- Authentication → Users → Add user
--   Email: admin@aptis.app
--   Password: (choose a secure password)
-- Then run this to give them ADMIN role:
--   UPDATE public.users SET role = 'ADMIN' WHERE email = 'admin@aptis.app';

-- Done! ✓
