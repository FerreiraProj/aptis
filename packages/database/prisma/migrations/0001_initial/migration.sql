-- Aptis initial migration
-- Run this AFTER prisma migrate dev --create-only generates the base SQL
-- This file contains the Supabase-specific additions

-- ─────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─────────────────────────────────────────────
-- VECTOR INDEX (HNSW for cosine similarity)
-- ─────────────────────────────────────────────

-- Run AFTER document_chunks table is created by Prisma migration
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx
  ON document_chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ─────────────────────────────────────────────
-- SUPABASE AUTH TRIGGER
-- Syncs auth.users → public.users on signup
-- ─────────────────────────────────────────────

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
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────

-- Enable RLS on all tables
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

-- Users: can read/update their own row
CREATE POLICY "users_own_select" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_own_update" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Documents: users own their documents
CREATE POLICY "documents_own" ON documents
  FOR ALL USING (user_id = auth.uid());

-- Document chunks: accessible if user owns the document
CREATE POLICY "document_chunks_via_document" ON document_chunks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_id AND d.user_id = auth.uid()
    )
  );

-- Flashcards: users own their flashcards
CREATE POLICY "flashcards_own" ON flashcards
  FOR ALL USING (user_id = auth.uid());

-- Quizzes: accessible if user owns the related document or created attempts
CREATE POLICY "quizzes_own_attempts" ON quizzes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quiz_attempts qa
      WHERE qa.quiz_id = id AND qa.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_id AND d.user_id = auth.uid()
    )
    OR document_id IS NULL
  );

-- Quiz questions/options: visible with quiz access
CREATE POLICY "quiz_questions_via_quiz" ON quiz_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      WHERE q.id = quiz_id
    )
  );

CREATE POLICY "quiz_options_via_question" ON quiz_options
  FOR SELECT USING (true);

-- Quiz attempts: users own their attempts
CREATE POLICY "quiz_attempts_own" ON quiz_attempts
  FOR ALL USING (user_id = auth.uid());

-- Quiz answers: via attempt ownership
CREATE POLICY "quiz_answers_via_attempt" ON quiz_answers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM quiz_attempts qa
      WHERE qa.id = attempt_id AND qa.user_id = auth.uid()
    )
  );

-- Study sessions
CREATE POLICY "study_sessions_own" ON study_sessions
  FOR ALL USING (user_id = auth.uid());

-- Study plans
CREATE POLICY "study_plans_own" ON study_plans
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "study_plan_days_via_plan" ON study_plan_days
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM study_plans sp
      WHERE sp.id = plan_id AND sp.user_id = auth.uid()
    )
  );

CREATE POLICY "study_plan_tasks_via_day" ON study_plan_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM study_plan_days spd
      JOIN study_plans sp ON sp.id = spd.plan_id
      WHERE spd.id = day_id AND sp.user_id = auth.uid()
    )
  );

-- Progress records
CREATE POLICY "progress_records_own" ON progress_records
  FOR ALL USING (user_id = auth.uid());

-- Chat
CREATE POLICY "chat_conversations_own" ON chat_conversations
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "chat_messages_via_conversation" ON chat_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM chat_conversations cc
      WHERE cc.id = conversation_id AND cc.user_id = auth.uid()
    )
  );

-- Subscriptions
CREATE POLICY "subscriptions_own" ON subscriptions
  FOR SELECT USING (user_id = auth.uid());

-- API usage logs: users can see their own
CREATE POLICY "api_usage_logs_own" ON api_usage_logs
  FOR SELECT USING (user_id = auth.uid());

-- NOTE: The service_role key (used in API routes via Prisma) bypasses RLS entirely.
-- These policies protect direct Supabase client access from the browser.
