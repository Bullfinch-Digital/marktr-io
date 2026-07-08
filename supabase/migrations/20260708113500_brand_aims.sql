-- Brand aims: versioned, brand-scoped top-layer growth aims for Strategy pillar.

CREATE TABLE IF NOT EXISTS public.brand_aims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  aim_type text NOT NULL CHECK (aim_type IN ('awareness', 'leads', 'enquiries', 'sales', 'retention')),
  description text NULL,
  lineage_id uuid NOT NULL DEFAULT gen_random_uuid(),
  version int NOT NULL DEFAULT 1,
  superseded_at timestamptz NULL,
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_aims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_aims_select_own"
  ON public.brand_aims
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "brand_aims_insert_own"
  ON public.brand_aims
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "brand_aims_update_own"
  ON public.brand_aims
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "brand_aims_delete_own"
  ON public.brand_aims
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS brand_aims_user_brand_idx
  ON public.brand_aims (user_id, brand_id);

CREATE INDEX IF NOT EXISTS brand_aims_lineage_idx
  ON public.brand_aims (lineage_id);

CREATE OR REPLACE VIEW public.brand_aims_current AS
  SELECT *
  FROM public.brand_aims
  WHERE superseded_at IS NULL AND deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.aim_insert_version(p_aim_id uuid, p_updates jsonb)
RETURNS public.brand_aims
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_row public.brand_aims;
  new_row public.brand_aims;
  now_ts timestamptz := now();
BEGIN
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
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected int;
BEGIN
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
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected int;
BEGIN
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
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
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

GRANT EXECUTE ON FUNCTION public.aim_insert_version(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.aim_soft_delete_lineage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.aim_restore_lineage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.aim_hard_delete_lineage(uuid) TO authenticated;
