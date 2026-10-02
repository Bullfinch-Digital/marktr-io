-- One row per score-email attempt. lead_email on the report stays the first address.
-- client_ip is the extra column the per-IP cap needs. RLS on, no public policies.

CREATE TABLE IF NOT EXISTS public.health_check_report_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.health_check_reports(id) ON DELETE CASCADE,
  email text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  ok boolean NOT NULL,
  client_ip text NULL
);

CREATE INDEX IF NOT EXISTS health_check_report_sends_report_sent_idx
  ON public.health_check_report_sends (report_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS health_check_report_sends_ip_sent_idx
  ON public.health_check_report_sends (client_ip, sent_at DESC);

ALTER TABLE public.health_check_report_sends ENABLE ROW LEVEL SECURITY;
