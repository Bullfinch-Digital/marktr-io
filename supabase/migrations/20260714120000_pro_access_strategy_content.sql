-- Pro entitlement helpers + Strategy/Content access gating.
--
-- Definition (must match src/lib/proAccess.ts PRO_SUBSCRIPTION_STATUSES):
--   latest stripe_subscriptions row status IN ('trialing', 'active').
-- Beta comps use status = 'active' and therefore count as Pro.

CREATE OR REPLACE FUNCTION public.is_pro_subscription_status(p_status text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_status IN ('trialing', 'active');
$$;

CREATE OR REPLACE FUNCTION public.user_has_pro_access(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM (
      SELECT s.status
      FROM public.stripe_subscriptions s
      WHERE s.user_id = p_user_id
      ORDER BY s.created_at DESC
      LIMIT 1
    ) latest
    WHERE public.is_pro_subscription_status(latest.status)
  );
$$;

CREATE OR REPLACE FUNCTION public.require_pro_access()
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.user_has_pro_access(auth.uid()) THEN
    RAISE EXCEPTION 'Pro subscription required'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_pro_subscription_status(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_pro_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.require_pro_access() TO authenticated;

-- ---------------------------------------------------------------------------
-- strategies RLS — ownership AND Pro
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "strategies_select_own" ON public.strategies;
DROP POLICY IF EXISTS "strategies_insert_own" ON public.strategies;
DROP POLICY IF EXISTS "strategies_update_own" ON public.strategies;
DROP POLICY IF EXISTS "strategies_delete_own" ON public.strategies;

CREATE POLICY "strategies_select_own"
  ON public.strategies
  FOR SELECT
  USING (auth.uid() = user_id AND public.user_has_pro_access());

CREATE POLICY "strategies_insert_own"
  ON public.strategies
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.user_has_pro_access());

CREATE POLICY "strategies_update_own"
  ON public.strategies
  FOR UPDATE
  USING (auth.uid() = user_id AND public.user_has_pro_access())
  WITH CHECK (auth.uid() = user_id AND public.user_has_pro_access());

CREATE POLICY "strategies_delete_own"
  ON public.strategies
  FOR DELETE
  USING (auth.uid() = user_id AND public.user_has_pro_access());

-- ---------------------------------------------------------------------------
-- strategy_aims RLS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "strategy_aims_select_own" ON public.strategy_aims;
DROP POLICY IF EXISTS "strategy_aims_insert_own" ON public.strategy_aims;
DROP POLICY IF EXISTS "strategy_aims_update_own" ON public.strategy_aims;
DROP POLICY IF EXISTS "strategy_aims_delete_own" ON public.strategy_aims;

CREATE POLICY "strategy_aims_select_own"
  ON public.strategy_aims
  FOR SELECT
  USING (auth.uid() = user_id AND public.user_has_pro_access());

CREATE POLICY "strategy_aims_insert_own"
  ON public.strategy_aims
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.user_has_pro_access());

CREATE POLICY "strategy_aims_update_own"
  ON public.strategy_aims
  FOR UPDATE
  USING (auth.uid() = user_id AND public.user_has_pro_access())
  WITH CHECK (auth.uid() = user_id AND public.user_has_pro_access());

CREATE POLICY "strategy_aims_delete_own"
  ON public.strategy_aims
  FOR DELETE
  USING (auth.uid() = user_id AND public.user_has_pro_access());

-- ---------------------------------------------------------------------------
-- strategy_targets RLS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "strategy_targets_select_own" ON public.strategy_targets;
DROP POLICY IF EXISTS "strategy_targets_insert_own" ON public.strategy_targets;
DROP POLICY IF EXISTS "strategy_targets_update_own" ON public.strategy_targets;
DROP POLICY IF EXISTS "strategy_targets_delete_own" ON public.strategy_targets;

CREATE POLICY "strategy_targets_select_own"
  ON public.strategy_targets
  FOR SELECT
  USING (auth.uid() = user_id AND public.user_has_pro_access());

CREATE POLICY "strategy_targets_insert_own"
  ON public.strategy_targets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.user_has_pro_access());

CREATE POLICY "strategy_targets_update_own"
  ON public.strategy_targets
  FOR UPDATE
  USING (auth.uid() = user_id AND public.user_has_pro_access())
  WITH CHECK (auth.uid() = user_id AND public.user_has_pro_access());

CREATE POLICY "strategy_targets_delete_own"
  ON public.strategy_targets
  FOR DELETE
  USING (auth.uid() = user_id AND public.user_has_pro_access());

-- ---------------------------------------------------------------------------
-- content_items RLS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "content_items_select_own" ON public.content_items;
DROP POLICY IF EXISTS "content_items_insert_own" ON public.content_items;
DROP POLICY IF EXISTS "content_items_update_own" ON public.content_items;
DROP POLICY IF EXISTS "content_items_delete_own" ON public.content_items;

CREATE POLICY "content_items_select_own"
  ON public.content_items
  FOR SELECT
  USING (auth.uid() = user_id AND public.user_has_pro_access());

CREATE POLICY "content_items_insert_own"
  ON public.content_items
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.user_has_pro_access());

CREATE POLICY "content_items_update_own"
  ON public.content_items
  FOR UPDATE
  USING (auth.uid() = user_id AND public.user_has_pro_access())
  WITH CHECK (auth.uid() = user_id AND public.user_has_pro_access());

CREATE POLICY "content_items_delete_own"
  ON public.content_items
  FOR DELETE
  USING (auth.uid() = user_id AND public.user_has_pro_access());

-- ---------------------------------------------------------------------------
-- SECURITY DEFINER RPCs still bypass RLS — require Pro explicitly, then keep
-- running as INVOKER so table policies also apply for defense in depth.
-- Bodies match the latest prior migrations; only Pro gate + security mode change.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.strategy_insert_version(p_strategy_id uuid, p_updates jsonb)
RETURNS public.strategies
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  old_row public.strategies;
  new_row public.strategies;
  now_ts timestamptz := now();
BEGIN
  PERFORM public.require_pro_access();

  SELECT * INTO old_row
  FROM public.strategies
  WHERE id = p_strategy_id AND user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Strategy not found';
  END IF;

  IF old_row.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot version a deleted strategy row';
  END IF;

  IF old_row.superseded_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot version a superseded strategy row';
  END IF;

  UPDATE public.strategies
  SET superseded_at = now_ts, updated_at = now_ts
  WHERE id = p_strategy_id AND user_id = auth.uid();

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
    old_row.user_id,
    old_row.brand_id,
    COALESCE(NULLIF(p_updates->>'title', ''), old_row.title),
    COALESCE(p_updates->'strategy', old_row.strategy),
    CASE
      WHEN p_updates ? 'channel' AND jsonb_typeof(p_updates->'channel') = 'null' THEN NULL
      WHEN p_updates ? 'channel' THEN ARRAY(SELECT jsonb_array_elements_text(p_updates->'channel'))
      ELSE old_row.channel
    END,
    COALESCE(NULLIF(p_updates->>'prompt_version', ''), old_row.prompt_version),
    COALESCE(NULLIF(p_updates->>'model', ''), old_row.model),
    old_row.lineage_id,
    old_row.version + 1,
    now_ts,
    now_ts,
    NULL,
    NULL
  )
  RETURNING * INTO new_row;

  RETURN new_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.strategy_soft_delete_lineage(p_lineage_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  affected int;
BEGIN
  PERFORM public.require_pro_access();

  UPDATE public.strategies
  SET deleted_at = now(), updated_at = now()
  WHERE user_id = auth.uid()
    AND lineage_id = p_lineage_id
    AND deleted_at IS NULL;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

CREATE OR REPLACE FUNCTION public.strategy_restore_lineage(p_lineage_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  affected int;
BEGIN
  PERFORM public.require_pro_access();

  UPDATE public.strategies
  SET deleted_at = NULL, updated_at = now()
  WHERE user_id = auth.uid()
    AND lineage_id = p_lineage_id
    AND deleted_at IS NOT NULL;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

CREATE OR REPLACE FUNCTION public.strategy_hard_delete_lineage(p_lineage_id uuid)
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

  DELETE FROM public.strategy_targets
  WHERE strategy_lineage_id = p_lineage_id
    AND user_id = v_user_id;

  DELETE FROM public.strategy_aims
  WHERE strategy_lineage_id = p_lineage_id
    AND user_id = v_user_id;

  DELETE FROM public.strategies
  WHERE lineage_id = p_lineage_id
    AND user_id = v_user_id;
END;
$$;

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
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_aim_count int;
  v_icp_count int;
  v_strategy_lineage_id uuid := gen_random_uuid();
  v_row public.strategies;
BEGIN
  PERFORM public.require_pro_access();

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

CREATE OR REPLACE FUNCTION public.content_insert_version(
  p_item_id uuid,
  p_updates jsonb
)
RETURNS public.content_items
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  old_row public.content_items;
  new_row public.content_items;
  now_ts timestamptz := now();
BEGIN
  PERFORM public.require_pro_access();

  SELECT * INTO old_row
  FROM public.content_items
  WHERE id = p_item_id AND user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Content item not found';
  END IF;

  IF old_row.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot version a deleted content item';
  END IF;

  IF old_row.superseded_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot version a superseded content item';
  END IF;

  UPDATE public.content_items
  SET superseded_at = now_ts, updated_at = now_ts
  WHERE id = p_item_id AND user_id = auth.uid();

  INSERT INTO public.content_items (
    user_id,
    brand_id,
    strategy_lineage_id,
    campaign_idea_id,
    campaign_idea_name_snapshot,
    icp_lineage_id,
    icp_name_snapshot,
    suggested_content_id,
    type,
    title,
    content,
    status,
    prompt_version,
    model,
    lineage_id,
    version,
    created_at,
    updated_at,
    superseded_at,
    deleted_at
  ) VALUES (
    old_row.user_id,
    old_row.brand_id,
    old_row.strategy_lineage_id,
    CASE
      WHEN p_updates ? 'campaign_idea_id' AND jsonb_typeof(p_updates->'campaign_idea_id') = 'null'
        THEN NULL
      WHEN p_updates ? 'campaign_idea_id'
        THEN NULLIF(p_updates->>'campaign_idea_id', '')::uuid
      ELSE old_row.campaign_idea_id
    END,
    CASE
      WHEN p_updates ? 'campaign_idea_name_snapshot' AND jsonb_typeof(p_updates->'campaign_idea_name_snapshot') = 'null'
        THEN NULL
      WHEN p_updates ? 'campaign_idea_name_snapshot'
        THEN NULLIF(p_updates->>'campaign_idea_name_snapshot', '')
      ELSE old_row.campaign_idea_name_snapshot
    END,
    COALESCE(NULLIF(p_updates->>'icp_lineage_id', '')::uuid, old_row.icp_lineage_id),
    COALESCE(NULLIF(p_updates->>'icp_name_snapshot', ''), old_row.icp_name_snapshot),
    CASE
      WHEN p_updates ? 'suggested_content_id' AND jsonb_typeof(p_updates->'suggested_content_id') = 'null'
        THEN NULL
      WHEN p_updates ? 'suggested_content_id'
        THEN NULLIF(p_updates->>'suggested_content_id', '')::uuid
      ELSE old_row.suggested_content_id
    END,
    COALESCE(NULLIF(p_updates->>'type', ''), old_row.type),
    COALESCE(NULLIF(p_updates->>'title', ''), old_row.title),
    COALESCE(p_updates->'content', old_row.content),
    COALESCE(NULLIF(p_updates->>'status', ''), old_row.status),
    COALESCE(NULLIF(p_updates->>'prompt_version', ''), old_row.prompt_version),
    COALESCE(NULLIF(p_updates->>'model', ''), old_row.model),
    old_row.lineage_id,
    old_row.version + 1,
    now_ts,
    now_ts,
    NULL,
    NULL
  )
  RETURNING * INTO new_row;

  RETURN new_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.content_soft_delete_lineage(p_lineage_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  affected int;
BEGIN
  PERFORM public.require_pro_access();

  UPDATE public.content_items
  SET deleted_at = now(), updated_at = now()
  WHERE user_id = auth.uid()
    AND lineage_id = p_lineage_id
    AND deleted_at IS NULL;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

CREATE OR REPLACE FUNCTION public.content_restore_lineage(p_lineage_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  affected int;
BEGIN
  PERFORM public.require_pro_access();

  UPDATE public.content_items
  SET deleted_at = NULL, updated_at = now()
  WHERE user_id = auth.uid()
    AND lineage_id = p_lineage_id
    AND deleted_at IS NOT NULL;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

CREATE OR REPLACE FUNCTION public.content_hard_delete_lineage(p_lineage_id uuid)
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
    FROM public.content_items
    WHERE lineage_id = p_lineage_id
      AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Content lineage not found';
  END IF;

  DELETE FROM public.content_items
  WHERE lineage_id = p_lineage_id
    AND user_id = v_user_id;
END;
$$;
