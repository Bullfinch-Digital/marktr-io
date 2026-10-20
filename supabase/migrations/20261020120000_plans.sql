-- Day-by-day plans: one plan per strategy stretch, one row per day, optional content links.

CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id uuid NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
  title text NOT NULL,
  length_days int NOT NULL CHECK (length_days IN (7, 14, 30)),
  start_date date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  extended_from uuid NULL REFERENCES public.plans(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.plan_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_number int NOT NULL CHECK (day_number >= 1),
  kind text NOT NULL DEFAULT 'post' CHECK (kind IN ('post', 'prep', 'review', 'rest')),
  title text NOT NULL,
  task text NOT NULL,
  channel text NULL,
  format text NULL,
  minutes int NULL,
  brief text NULL,
  why text NULL,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'done')),
  done_at timestamptz NULL,
  notes text NOT NULL DEFAULT '',
  results text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, day_number)
);

CREATE TABLE IF NOT EXISTS public.plan_day_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_day_id uuid NOT NULL REFERENCES public.plan_days(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id uuid NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plans_user_status_idx
  ON public.plans (user_id, status);

CREATE INDEX IF NOT EXISTS plan_days_plan_day_number_idx
  ON public.plan_days (plan_id, day_number);

CREATE INDEX IF NOT EXISTS plan_day_content_plan_day_idx
  ON public.plan_day_content (plan_day_id);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_day_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_select_own"
  ON public.plans
  FOR SELECT
  USING (auth.uid() = user_id AND public.user_has_pro_access());

CREATE POLICY "plans_insert_own"
  ON public.plans
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.user_has_pro_access());

CREATE POLICY "plans_update_own"
  ON public.plans
  FOR UPDATE
  USING (auth.uid() = user_id AND public.user_has_pro_access())
  WITH CHECK (auth.uid() = user_id AND public.user_has_pro_access());

CREATE POLICY "plans_delete_own"
  ON public.plans
  FOR DELETE
  USING (auth.uid() = user_id AND public.user_has_pro_access());

CREATE POLICY "plan_days_select_own"
  ON public.plan_days
  FOR SELECT
  USING (auth.uid() = user_id AND public.user_has_pro_access());

CREATE POLICY "plan_days_insert_own"
  ON public.plan_days
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.user_has_pro_access());

CREATE POLICY "plan_days_update_own"
  ON public.plan_days
  FOR UPDATE
  USING (auth.uid() = user_id AND public.user_has_pro_access())
  WITH CHECK (auth.uid() = user_id AND public.user_has_pro_access());

CREATE POLICY "plan_days_delete_own"
  ON public.plan_days
  FOR DELETE
  USING (auth.uid() = user_id AND public.user_has_pro_access());

CREATE POLICY "plan_day_content_select_own"
  ON public.plan_day_content
  FOR SELECT
  USING (auth.uid() = user_id AND public.user_has_pro_access());

CREATE POLICY "plan_day_content_insert_own"
  ON public.plan_day_content
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.user_has_pro_access());

CREATE POLICY "plan_day_content_update_own"
  ON public.plan_day_content
  FOR UPDATE
  USING (auth.uid() = user_id AND public.user_has_pro_access())
  WITH CHECK (auth.uid() = user_id AND public.user_has_pro_access());

CREATE POLICY "plan_day_content_delete_own"
  ON public.plan_day_content
  FOR DELETE
  USING (auth.uid() = user_id AND public.user_has_pro_access());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.plan_days TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.plan_day_content TO authenticated;
