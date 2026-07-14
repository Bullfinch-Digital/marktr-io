-- Close Strategy-page aim gap: brand_aims was left ownership-only while
-- strategies / content were Pro-gated. "Add aim" inserts directly into
-- brand_aims (useBrandAims.createAim) — not strategy_aims / strategies.
--
-- Uses the same public.user_has_pro_access() definition as
-- 20260714120000_pro_access_strategy_content.sql / src/lib/proAccess.ts.

DROP POLICY IF EXISTS "brand_aims_select_own" ON public.brand_aims;
DROP POLICY IF EXISTS "brand_aims_insert_own" ON public.brand_aims;
DROP POLICY IF EXISTS "brand_aims_update_own" ON public.brand_aims;
DROP POLICY IF EXISTS "brand_aims_delete_own" ON public.brand_aims;

CREATE POLICY "brand_aims_select_own"
  ON public.brand_aims
  FOR SELECT
  USING (auth.uid() = user_id AND public.user_has_pro_access());

CREATE POLICY "brand_aims_insert_own"
  ON public.brand_aims
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.user_has_pro_access());

CREATE POLICY "brand_aims_update_own"
  ON public.brand_aims
  FOR UPDATE
  USING (auth.uid() = user_id AND public.user_has_pro_access())
  WITH CHECK (auth.uid() = user_id AND public.user_has_pro_access());

CREATE POLICY "brand_aims_delete_own"
  ON public.brand_aims
  FOR DELETE
  USING (auth.uid() = user_id AND public.user_has_pro_access());

CREATE OR REPLACE FUNCTION public.aim_insert_version(p_aim_id uuid, p_updates jsonb)
RETURNS public.brand_aims
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  old_row public.brand_aims;
  new_row public.brand_aims;
  now_ts timestamptz := now();
BEGIN
  PERFORM public.require_pro_access();

  SELECT * INTO old_row
  FROM public.brand_aims
  WHERE id = p_aim_id AND user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Brand aim not found';
  END IF;

  IF old_row.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot version a deleted aim';
  END IF;

  IF old_row.superseded_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot version a superseded aim';
  END IF;

  UPDATE public.brand_aims
  SET superseded_at = now_ts, updated_at = now_ts
  WHERE id = p_aim_id AND user_id = auth.uid();

  INSERT INTO public.brand_aims (
    user_id,
    brand_id,
    title,
    aim_type,
    description,
    lineage_id,
    version,
    superseded_at,
    deleted_at,
    created_at,
    updated_at
  ) VALUES (
    old_row.user_id,
    COALESCE(NULLIF(p_updates->>'brand_id', '')::uuid, old_row.brand_id),
    COALESCE(NULLIF(p_updates->>'title', ''), old_row.title),
    COALESCE(NULLIF(p_updates->>'aim_type', ''), old_row.aim_type),
    CASE WHEN p_updates ? 'description' THEN NULLIF(p_updates->>'description', '') ELSE old_row.description END,
    old_row.lineage_id,
    old_row.version + 1,
    NULL,
    NULL,
    now_ts,
    now_ts
  )
  RETURNING * INTO new_row;

  RETURN new_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.aim_soft_delete_lineage(p_lineage_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  affected int;
BEGIN
  PERFORM public.require_pro_access();

  UPDATE public.brand_aims
  SET deleted_at = now(), updated_at = now()
  WHERE user_id = auth.uid()
    AND lineage_id = p_lineage_id
    AND deleted_at IS NULL;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

CREATE OR REPLACE FUNCTION public.aim_restore_lineage(p_lineage_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  affected int;
BEGIN
  PERFORM public.require_pro_access();

  UPDATE public.brand_aims
  SET deleted_at = NULL, updated_at = now()
  WHERE user_id = auth.uid()
    AND lineage_id = p_lineage_id
    AND deleted_at IS NOT NULL;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

CREATE OR REPLACE FUNCTION public.aim_hard_delete_lineage(p_lineage_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  PERFORM public.require_pro_access();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.brand_aims
    WHERE lineage_id = p_lineage_id
      AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Brand aim lineage not found';
  END IF;

  DELETE FROM public.brand_aims
  WHERE lineage_id = p_lineage_id
    AND user_id = v_user_id;
END;
$$;
