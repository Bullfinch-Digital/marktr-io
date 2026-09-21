-- Fix caps enforcement for strategy_create_with_links:
-- Postgres array_length(empty_array, 1) returns NULL, which previously bypassed min checks.
-- Use cardinality() so empty arrays correctly fail.

CREATE OR REPLACE FUNCTION public.strategy_create_with_links(
  p_brand_id uuid,
  p_title text,
  p_strategy jsonb,
  p_channel text[],
  p_prompt_version text,
  p_model text,
  p_aim_lineage_ids uuid[],
  p_icp_lineage_ids uuid[]
)
RETURNS public.strategies
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_aim_count int;
  v_icp_count int;
  v_strategy_lineage_id uuid := gen_random_uuid();
  v_row public.strategies;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_aim_lineage_ids IS NULL OR cardinality(p_aim_lineage_ids) NOT BETWEEN 1 AND 3 THEN
    RAISE EXCEPTION 'Invalid aims count (need 1-3)';
  END IF;

  IF p_icp_lineage_ids IS NULL OR cardinality(p_icp_lineage_ids) NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'Invalid ICP targets count (need 1-5)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.brands
    WHERE id = p_brand_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Brand not found for user';
  END IF;

  SELECT COUNT(*) INTO v_aim_count
  FROM public.brand_aims
  WHERE user_id = v_user_id
    AND brand_id = p_brand_id
    AND superseded_at IS NULL AND deleted_at IS NULL
    AND lineage_id = ANY(p_aim_lineage_ids);

  IF v_aim_count != cardinality(p_aim_lineage_ids) THEN
    RAISE EXCEPTION 'Some aim_lineage_ids are not current for this brand';
  END IF;

  SELECT COUNT(*) INTO v_icp_count
  FROM public.icps
  WHERE user_id = v_user_id
    AND brand_id = p_brand_id
    AND superseded_at IS NULL AND deleted_at IS NULL
    AND lineage_id = ANY(p_icp_lineage_ids);

  IF v_icp_count != cardinality(p_icp_lineage_ids) THEN
    RAISE EXCEPTION 'Some icp_lineage_ids are not current for this brand';
  END IF;

  INSERT INTO public.strategies (
    user_id,
    brand_id,
    title,
    strategy,
    channel,
    prompt_version,
    model,
    lineage_id,
    version,
    created_at,
    updated_at,
    superseded_at,
    deleted_at
  ) VALUES (
    v_user_id,
    p_brand_id,
    p_title,
    p_strategy,
    p_channel,
    p_prompt_version,
    p_model,
    v_strategy_lineage_id,
    1,
    now(),
    now(),
    NULL,
    NULL
  )
  RETURNING * INTO v_row;

  INSERT INTO public.strategy_aims (
    strategy_lineage_id,
    aim_lineage_id,
    user_id
  )
  SELECT v_strategy_lineage_id, unnest(p_aim_lineage_ids), v_user_id;

  INSERT INTO public.strategy_targets (
    strategy_lineage_id,
    icp_lineage_id,
    user_id
  )
  SELECT v_strategy_lineage_id, unnest(p_icp_lineage_ids), v_user_id;

  RETURN v_row;
END;
$$;

