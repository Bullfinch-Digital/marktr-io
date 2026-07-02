-- ICP append-only versioning: lineage_id, generation_id, version, superseded_at

ALTER TABLE public.icps
  ADD COLUMN IF NOT EXISTS lineage_id uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS generation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS superseded_at timestamptz NULL;

-- Existing rows: defaults above give each row its own lineage/generation; version=1; superseded_at NULL.

DROP INDEX IF EXISTS public.icps_user_brand_name_uidx;

CREATE UNIQUE INDEX IF NOT EXISTS icps_current_name_uidx
  ON public.icps (
    user_id,
    COALESCE(brand_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(btrim(name))
  )
  WHERE superseded_at IS NULL;

CREATE OR REPLACE VIEW public.icps_current AS
  SELECT * FROM public.icps WHERE superseded_at IS NULL;

-- Supersede all current ICP rows for a brand (used before full regeneration).
CREATE OR REPLACE FUNCTION public.icp_supersede_brand_current(p_brand_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected int;
BEGIN
  UPDATE public.icps
  SET superseded_at = now(), updated_at = now()
  WHERE user_id = auth.uid()
    AND superseded_at IS NULL
    AND (
      (p_brand_id IS NULL AND brand_id IS NULL)
      OR brand_id = p_brand_id
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- Insert a new version row; supersede the prior current row in one transaction.
CREATE OR REPLACE FUNCTION public.icp_insert_version(p_icp_id uuid, p_updates jsonb)
RETURNS public.icps
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_row public.icps;
  new_row public.icps;
  now_ts timestamptz := now();
BEGIN
  SELECT * INTO old_row
  FROM public.icps
  WHERE id = p_icp_id AND user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ICP not found';
  END IF;

  IF old_row.superseded_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot version a superseded ICP row';
  END IF;

  UPDATE public.icps
  SET superseded_at = now_ts, updated_at = now_ts
  WHERE id = p_icp_id AND user_id = auth.uid();

  INSERT INTO public.icps (
    user_id,
    brand_id,
    name,
    description,
    industry,
    company_size,
    location,
    goals,
    pain_points,
    budget,
    decision_makers,
    tech_stack,
    challenges,
    opportunities,
    tags,
    color,
    collection_id,
    avatar_key,
    avatar_gender,
    avatar_age_range,
    lineage_id,
    generation_id,
    version,
    created_at,
    updated_at,
    superseded_at
  ) VALUES (
    old_row.user_id,
    CASE
      WHEN p_updates ? 'brand_id' AND jsonb_typeof(p_updates->'brand_id') = 'null' THEN NULL
      WHEN p_updates ? 'brand_id' THEN NULLIF(p_updates->>'brand_id', '')::uuid
      ELSE old_row.brand_id
    END,
    COALESCE(NULLIF(p_updates->>'name', ''), old_row.name),
    COALESCE(NULLIF(p_updates->>'description', ''), old_row.description),
    CASE WHEN p_updates ? 'industry' THEN NULLIF(p_updates->>'industry', '') ELSE old_row.industry END,
    CASE WHEN p_updates ? 'company_size' THEN NULLIF(p_updates->>'company_size', '') ELSE old_row.company_size END,
    CASE WHEN p_updates ? 'location' THEN NULLIF(p_updates->>'location', '') ELSE old_row.location END,
    CASE WHEN p_updates ? 'goals' THEN ARRAY(SELECT jsonb_array_elements_text(p_updates->'goals'))::text[] ELSE old_row.goals END,
    CASE WHEN p_updates ? 'pain_points' THEN ARRAY(SELECT jsonb_array_elements_text(p_updates->'pain_points'))::text[] ELSE old_row.pain_points END,
    CASE WHEN p_updates ? 'budget' THEN NULLIF(p_updates->>'budget', '') ELSE old_row.budget END,
    CASE WHEN p_updates ? 'decision_makers' THEN ARRAY(SELECT jsonb_array_elements_text(p_updates->'decision_makers'))::text[] ELSE old_row.decision_makers END,
    CASE WHEN p_updates ? 'tech_stack' THEN ARRAY(SELECT jsonb_array_elements_text(p_updates->'tech_stack'))::text[] ELSE old_row.tech_stack END,
    CASE WHEN p_updates ? 'challenges' THEN ARRAY(SELECT jsonb_array_elements_text(p_updates->'challenges'))::text[] ELSE old_row.challenges END,
    CASE WHEN p_updates ? 'opportunities' THEN ARRAY(SELECT jsonb_array_elements_text(p_updates->'opportunities'))::text[] ELSE old_row.opportunities END,
    CASE WHEN p_updates ? 'tags' THEN ARRAY(SELECT jsonb_array_elements_text(p_updates->'tags'))::text[] ELSE old_row.tags END,
    CASE WHEN p_updates ? 'color' THEN NULLIF(p_updates->>'color', '') ELSE old_row.color END,
    old_row.collection_id,
    CASE WHEN p_updates ? 'avatar_key' THEN NULLIF(p_updates->>'avatar_key', '') ELSE old_row.avatar_key END,
    CASE WHEN p_updates ? 'avatar_gender' THEN NULLIF(p_updates->>'avatar_gender', '') ELSE old_row.avatar_gender END,
    CASE WHEN p_updates ? 'avatar_age_range' THEN NULLIF(p_updates->>'avatar_age_range', '') ELSE old_row.avatar_age_range END,
    old_row.lineage_id,
    old_row.generation_id,
    old_row.version + 1,
    now_ts,
    now_ts,
    NULL
  )
  RETURNING * INTO new_row;

  RETURN new_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.icp_supersede_brand_current(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.icp_insert_version(uuid, jsonb) TO authenticated;
