-- Daily job: delete health check reports older than 24 months.
-- Their health_check_report_sends rows go with them (ON DELETE CASCADE).
-- The only log line is the number of reports deleted.

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.purge_expired_health_check_reports()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.health_check_reports
  WHERE created_at < now() - interval '24 months';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE LOG 'health_check_reports retention deleted %', deleted_count;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_health_check_reports() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_expired_health_check_reports() FROM anon;
REVOKE ALL ON FUNCTION public.purge_expired_health_check_reports() FROM authenticated;

DO $cron$
DECLARE
  existing bigint;
BEGIN
  SELECT jobid INTO existing
  FROM cron.job
  WHERE jobname = 'purge-expired-health-check-reports';
  IF existing IS NOT NULL THEN
    PERFORM cron.unschedule(existing);
  END IF;
END
$cron$;

SELECT cron.schedule(
  'purge-expired-health-check-reports',
  '15 3 * * *',
  'SELECT public.purge_expired_health_check_reports()'
);
