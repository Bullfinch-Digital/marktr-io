-- Production public.icps predates avatar metadata (baseline CREATE TABLE IF NOT EXISTS is a no-op).
-- Guest + authenticated onboarding inserts avatar_key / avatar_gender / avatar_age_range.

ALTER TABLE public.icps
  ADD COLUMN IF NOT EXISTS avatar_key text,
  ADD COLUMN IF NOT EXISTS avatar_gender text,
  ADD COLUMN IF NOT EXISTS avatar_age_range text;

COMMENT ON COLUMN public.icps.avatar_key IS 'Relative path under /images/avatars (see avatarLibrary.ts)';
COMMENT ON COLUMN public.icps.avatar_gender IS 'Avatar pool gender: male | female';
COMMENT ON COLUMN public.icps.avatar_age_range IS 'Avatar pool age band e.g. 25-34';
