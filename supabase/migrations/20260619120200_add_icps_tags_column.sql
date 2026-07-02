-- Live icps predates baseline migration (CREATE TABLE IF NOT EXISTS was a no-op).
-- App code and icp_insert_version RPC expect tags; add it on existing installs.

ALTER TABLE public.icps
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[];
