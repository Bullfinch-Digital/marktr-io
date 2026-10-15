-- Posting log: one row per marked (or extra) post on a strategy.

CREATE TABLE IF NOT EXISTS public.post_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id uuid NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
  channel text NOT NULL,
  posted_on date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS post_log_user_posted_on_idx
  ON public.post_log (user_id, posted_on DESC);

ALTER TABLE public.post_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_log_select_own"
  ON public.post_log
  FOR SELECT
  USING (auth.uid() = user_id AND public.user_has_pro_access());

CREATE POLICY "post_log_insert_own"
  ON public.post_log
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.user_has_pro_access());

CREATE POLICY "post_log_delete_own"
  ON public.post_log
  FOR DELETE
  USING (auth.uid() = user_id AND public.user_has_pro_access());

GRANT SELECT, INSERT, DELETE ON TABLE public.post_log TO authenticated;
