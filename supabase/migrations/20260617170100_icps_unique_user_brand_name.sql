-- Remove duplicate ICP rows (keep earliest per user + brand + name) before unique index.
DELETE FROM public.icps AS newer
USING public.icps AS older
WHERE newer.id > older.id
  AND newer.user_id = older.user_id
  AND COALESCE(newer.brand_id, '00000000-0000-0000-0000-000000000000'::uuid)
    = COALESCE(older.brand_id, '00000000-0000-0000-0000-000000000000'::uuid)
  AND lower(btrim(newer.name)) = lower(btrim(older.name));

-- Prevent duplicate guest-flush ICP rows (reload-safe at DB layer).
CREATE UNIQUE INDEX IF NOT EXISTS icps_user_brand_name_uidx
  ON public.icps (
    user_id,
    COALESCE(brand_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(btrim(name))
  );
