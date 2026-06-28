-- Prevent duplicate guest-flush ICP rows (reload-safe at DB layer).
-- NULL brand_id is coalesced so guest flushes without a brand still dedupe.

CREATE UNIQUE INDEX IF NOT EXISTS icps_user_brand_name_uidx
  ON public.icps (
    user_id,
    COALESCE(brand_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(btrim(name))
  );
