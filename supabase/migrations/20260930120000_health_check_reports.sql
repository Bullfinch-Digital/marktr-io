-- Immutable Health Check report snapshots (Bullfinch edition, Phase 1).
-- RLS on, no public policies: all access via service-role edge functions.

CREATE TABLE IF NOT EXISTS public.health_check_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NULL,
  edition text NOT NULL CHECK (edition IN ('marktr', 'bullfinch')),
  public_token text NOT NULL UNIQUE,
  url text NOT NULL,
  overall integer,
  capped boolean,
  website_score integer,
  brand_story_score integer,
  content_score integer,
  social_score integer,
  facts jsonb,
  findings jsonb,
  scores jsonb NOT NULL,
  bf_route text NULL,
  scoring_version text NOT NULL,
  lead_first_name text NULL,
  lead_email text NULL,
  lead_business text NULL,
  marketing_consent boolean NULL,
  consent_at timestamptz NULL,
  utm jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS health_check_reports_edition_idx
  ON public.health_check_reports (edition);

CREATE INDEX IF NOT EXISTS health_check_reports_created_at_idx
  ON public.health_check_reports (created_at DESC);

COMMENT ON TABLE public.health_check_reports IS
  'Append-only Health Check snapshots. Score fields never change after insert; lead columns and bf_route may be set once while null.';

ALTER TABLE public.health_check_reports ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.health_check_reports_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.scores IS DISTINCT FROM OLD.scores
      OR NEW.overall IS DISTINCT FROM OLD.overall
      OR NEW.capped IS DISTINCT FROM OLD.capped
      OR NEW.website_score IS DISTINCT FROM OLD.website_score
      OR NEW.brand_story_score IS DISTINCT FROM OLD.brand_story_score
      OR NEW.content_score IS DISTINCT FROM OLD.content_score
      OR NEW.social_score IS DISTINCT FROM OLD.social_score
      OR NEW.facts IS DISTINCT FROM OLD.facts
      OR NEW.findings IS DISTINCT FROM OLD.findings
      OR NEW.scoring_version IS DISTINCT FROM OLD.scoring_version
      OR NEW.public_token IS DISTINCT FROM OLD.public_token
      OR NEW.edition IS DISTINCT FROM OLD.edition
      OR NEW.url IS DISTINCT FROM OLD.url
      OR NEW.run_id IS DISTINCT FROM OLD.run_id
      OR NEW.utm IS DISTINCT FROM OLD.utm
    THEN
      RAISE EXCEPTION 'health_check_reports snapshot fields are immutable';
    END IF;

    IF OLD.bf_route IS NOT NULL AND NEW.bf_route IS DISTINCT FROM OLD.bf_route THEN
      RAISE EXCEPTION 'health_check_reports bf_route cannot be overwritten';
    END IF;

    IF OLD.lead_email IS NOT NULL AND NEW.lead_email IS DISTINCT FROM OLD.lead_email THEN
      RAISE EXCEPTION 'health_check_reports lead fields cannot be overwritten';
    END IF;
    IF OLD.lead_first_name IS NOT NULL AND NEW.lead_first_name IS DISTINCT FROM OLD.lead_first_name THEN
      RAISE EXCEPTION 'health_check_reports lead fields cannot be overwritten';
    END IF;
    IF OLD.lead_business IS NOT NULL AND NEW.lead_business IS DISTINCT FROM OLD.lead_business THEN
      RAISE EXCEPTION 'health_check_reports lead fields cannot be overwritten';
    END IF;
    IF OLD.marketing_consent IS NOT NULL AND NEW.marketing_consent IS DISTINCT FROM OLD.marketing_consent THEN
      RAISE EXCEPTION 'health_check_reports lead fields cannot be overwritten';
    END IF;
    IF OLD.consent_at IS NOT NULL AND NEW.consent_at IS DISTINCT FROM OLD.consent_at THEN
      RAISE EXCEPTION 'health_check_reports lead fields cannot be overwritten';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS health_check_reports_guard ON public.health_check_reports;
CREATE TRIGGER health_check_reports_guard
  BEFORE UPDATE ON public.health_check_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.health_check_reports_guard();
