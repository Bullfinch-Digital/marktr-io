-- Baseline public.icps (table already exists in production; captured from app usage).
-- Safe on fresh installs via IF NOT EXISTS; no-op when the live table is present.

CREATE TABLE IF NOT EXISTS public.icps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  industry text,
  company_size text,
  location text,
  goals text[] DEFAULT '{}'::text[],
  pain_points text[] DEFAULT '{}'::text[],
  budget text,
  decision_makers text[] DEFAULT '{}'::text[],
  tech_stack text[] DEFAULT '{}'::text[],
  challenges text[] DEFAULT '{}'::text[],
  opportunities text[] DEFAULT '{}'::text[],
  tags text[] DEFAULT '{}'::text[],
  color text,
  collection_id uuid,
  avatar_key text,
  avatar_gender text,
  avatar_age_range text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.icps ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'icps' AND policyname = 'icps_select_own'
  ) THEN
    CREATE POLICY icps_select_own ON public.icps FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'icps' AND policyname = 'icps_insert_own'
  ) THEN
    CREATE POLICY icps_insert_own ON public.icps FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'icps' AND policyname = 'icps_update_own'
  ) THEN
    CREATE POLICY icps_update_own ON public.icps FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'icps' AND policyname = 'icps_delete_own'
  ) THEN
    CREATE POLICY icps_delete_own ON public.icps FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;
