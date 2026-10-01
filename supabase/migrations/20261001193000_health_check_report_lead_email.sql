-- Lead capture timestamps and marketing opt-in for the Bullfinch score email.
-- email_sent_at may move forward so a visitor email can be re-sent after 10 minutes.
-- Other lead columns stay set-once. RLS stays closed (no public policies).

ALTER TABLE public.health_check_reports
  ADD COLUMN IF NOT EXISTS marketing_opt_in boolean NULL,
  ADD COLUMN IF NOT EXISTS lead_captured_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz NULL;

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
    IF OLD.marketing_opt_in IS NOT NULL AND NEW.marketing_opt_in IS DISTINCT FROM OLD.marketing_opt_in THEN
      RAISE EXCEPTION 'health_check_reports lead fields cannot be overwritten';
    END IF;
    IF OLD.lead_captured_at IS NOT NULL AND NEW.lead_captured_at IS DISTINCT FROM OLD.lead_captured_at THEN
      RAISE EXCEPTION 'health_check_reports lead fields cannot be overwritten';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
