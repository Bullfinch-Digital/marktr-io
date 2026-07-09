-- Snapshot names on strategy join rows so composition survives permanent deletes.

ALTER TABLE public.strategy_targets
  ADD COLUMN IF NOT EXISTS icp_name_snapshot text;

ALTER TABLE public.strategy_aims
  ADD COLUMN IF NOT EXISTS aim_title_snapshot text,
  ADD COLUMN IF NOT EXISTS aim_type_snapshot text;

-- Backfill ICP name snapshots from best available icps row per lineage.
UPDATE public.strategy_targets st
SET icp_name_snapshot = picked.name
FROM (
  SELECT DISTINCT ON (st2.id)
    st2.id AS join_id,
    i.name
  FROM public.strategy_targets st2
  INNER JOIN public.icps i
    ON i.lineage_id = st2.icp_lineage_id
   AND i.user_id = st2.user_id
  ORDER BY
    st2.id,
    CASE WHEN i.superseded_at IS NULL AND i.deleted_at IS NULL THEN 0 ELSE 1 END,
    i.version DESC NULLS LAST
) picked
WHERE st.id = picked.join_id
  AND st.icp_name_snapshot IS NULL;

-- Backfill aim snapshots from best available brand_aims row per lineage.
UPDATE public.strategy_aims sa
SET
  aim_title_snapshot = picked.title,
  aim_type_snapshot = picked.aim_type
FROM (
  SELECT DISTINCT ON (sa2.id)
    sa2.id AS join_id,
    ba.title,
    ba.aim_type::text AS aim_type
  FROM public.strategy_aims sa2
  INNER JOIN public.brand_aims ba
    ON ba.lineage_id = sa2.aim_lineage_id
   AND ba.user_id = sa2.user_id
  ORDER BY
    sa2.id,
    CASE WHEN ba.superseded_at IS NULL AND ba.deleted_at IS NULL THEN 0 ELSE 1 END,
    ba.version DESC NULLS LAST
) picked
WHERE sa.id = picked.join_id
  AND sa.aim_title_snapshot IS NULL;

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
    user_id,
    aim_title_snapshot,
    aim_type_snapshot
  )
  SELECT
    v_strategy_lineage_id,
    aim_lineage_id,
    v_user_id,
    ba.title,
    ba.aim_type::text
  FROM unnest(p_aim_lineage_ids) AS aim_lineage_id
  INNER JOIN public.brand_aims ba
    ON ba.lineage_id = aim_lineage_id
   AND ba.user_id = v_user_id
   AND ba.superseded_at IS NULL
   AND ba.deleted_at IS NULL;

  INSERT INTO public.strategy_targets (
    strategy_lineage_id,
    icp_lineage_id,
    user_id,
    icp_name_snapshot
  )
  SELECT
    v_strategy_lineage_id,
    icp_lineage_id,
    v_user_id,
    i.name
  FROM unnest(p_icp_lineage_ids) AS icp_lineage_id
  INNER JOIN public.icps i
    ON i.lineage_id = icp_lineage_id
   AND i.user_id = v_user_id
   AND i.superseded_at IS NULL
   AND i.deleted_at IS NULL;

  RETURN v_row;
END;
$$;
