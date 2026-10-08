-- Internal admin notification dedupe/throttle log.
-- Service role only (RLS on, no public policies).
-- Do not apply to production until reviewed.

CREATE TABLE IF NOT EXISTS public.admin_notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  dedupe_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  suppressed_count integer NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_notification_log_dedupe_key_uidx
  ON public.admin_notification_log (dedupe_key);

CREATE INDEX IF NOT EXISTS admin_notification_log_created_at_idx
  ON public.admin_notification_log (created_at DESC);

CREATE INDEX IF NOT EXISTS admin_notification_log_event_type_created_idx
  ON public.admin_notification_log (event_type, created_at DESC);

COMMENT ON TABLE public.admin_notification_log IS
  'Dedupe and throttle log for internal Gmail admin notices. Inserts via Edge Functions (service role).';
COMMENT ON COLUMN public.admin_notification_log.dedupe_key IS
  'Unique send key (e.g. signup:{user_id}). Conflict means skip.';
COMMENT ON COLUMN public.admin_notification_log.suppressed_count IS
  'Extra matching events dropped while this row was the active throttle window.';

ALTER TABLE public.admin_notification_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.admin_notification_log FROM anon, authenticated;
GRANT ALL ON public.admin_notification_log TO service_role;
