-- ============================================================
-- APTIS — Supabase-specific setup
--
-- Run AFTER `prisma db push` has created the tables from schema.prisma:
--   pnpm --filter @aptis/database db:setup
--
-- Idempotent: safe to run again at any time.
-- ============================================================

-- ─── 1. Vector index (HNSW, cosine) for RAG search ───────────
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx
  ON document_chunks USING hnsw (embedding extensions.vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ─── 2. Auth trigger: auth.users → public.users on signup ────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

-- ─── 3. Storage bucket for temporary uploads (private) ───────
-- Files are deleted right after text extraction. Server uses the service key.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('uploads', 'uploads', false, 52428800) -- 50 MB
ON CONFLICT (id) DO NOTHING;

-- ─── 4. Row Level Security on EVERY public table ─────────────
-- The app reads/writes the DB only through Prisma (table owner, bypasses RLS).
-- Supabase also exposes every public table over its REST API with the anon key,
-- so RLS must be ON everywhere; tables without a policy are simply not reachable
-- from the browser (beta applications, discounts, affiliates, configs, usage…).
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;

-- Owner-only read policies (defence in depth for any future direct client access)
DROP POLICY IF EXISTS "users_own_select" ON users;
CREATE POLICY "users_own_select" ON users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "documents_own" ON documents;
CREATE POLICY "documents_own" ON documents FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "flashcards_own" ON flashcards;
CREATE POLICY "flashcards_own" ON flashcards FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "subjects_own" ON subjects;
CREATE POLICY "subjects_own" ON subjects FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "subscriptions_own" ON subscriptions;
CREATE POLICY "subscriptions_own" ON subscriptions FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "chat_conversations_own" ON chat_conversations;
CREATE POLICY "chat_conversations_own" ON chat_conversations FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "study_plans_own" ON study_plans;
CREATE POLICY "study_plans_own" ON study_plans FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "quiz_attempts_own" ON quiz_attempts;
CREATE POLICY "quiz_attempts_own" ON quiz_attempts FOR SELECT USING (user_id = auth.uid());
