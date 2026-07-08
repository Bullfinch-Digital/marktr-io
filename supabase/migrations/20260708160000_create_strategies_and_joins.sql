-- Strategy pillar Stage 2: strategy entity + joins
-- Versioned like ICPs/aims: lineage_id survives, superseded_at/deleted_at indicate current/archived.

CREATE TABLE IF NOT EXISTS public.strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  strategy jsonb NOT NULL,
  channel text[] NULL,
  prompt_version text NOT NULL,
  model text NOT NULL,
  lineage_id uuid NOT NULL DEFAULT gen_random_uuid(),
  version int NOT NULL DEFAULT 1,
  superseded_at timestamptz NULL,
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "strategies_select_own"
  ON public.strategies
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "strategies_insert_own"
  ON public.strategies
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "strategies_update_own"
  ON public.strategies
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "strategies_delete_own"
  ON public.strategies
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS strategies_user_brand_idx
  ON public.strategies (user_id, brand_id);

CREATE INDEX IF NOT EXISTS strategies_lineage_idx
  ON public.strategies (lineage_id);

CREATE OR REPLACE VIEW public.strategies_current AS
  SELECT *
  FROM public.strategies
  WHERE superseded_at IS NULL AND deleted_at IS NULL;

-- Many-to-many: Strategy ↔ Aims (lineage-scoped links survive edits + version bumps)
CREATE TABLE IF NOT EXISTS public.strategy_aims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_lineage_id uuid NOT NULL,
  aim_lineage_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.strategy_aims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "strategy_aims_select_own"
  ON public.strategy_aims
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "strategy_aims_insert_own"
  ON public.strategy_aims
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "strategy_aims_update_own"
  ON public.strategy_aims
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "strategy_aims_delete_own"
  ON public.strategy_aims
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS strategy_aims_strategy_aim_lineage_uidx
  ON public.strategy_aims (strategy_lineage_id, aim_lineage_id);

CREATE INDEX IF NOT EXISTS strategy_aims_user_strategy_idx
  ON public.strategy_aims (user_id, strategy_lineage_id);

-- Many-to-many: Strategy ↔ ICPs (lineage-scoped links survive ICP version bumps)
CREATE TABLE IF NOT EXISTS public.strategy_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_lineage_id uuid NOT NULL,
  icp_lineage_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.strategy_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "strategy_targets_select_own"
  ON public.strategy_targets
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "strategy_targets_insert_own"
  ON public.strategy_targets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "strategy_targets_update_own"
  ON public.strategy_targets
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "strategy_targets_delete_own"
  ON public.strategy_targets
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS strategy_targets_strategy_icp_lineage_uidx
  ON public.strategy_targets (strategy_lineage_id, icp_lineage_id);

CREATE INDEX IF NOT EXISTS strategy_targets_user_strategy_idx
  ON public.strategy_targets (user_id, strategy_lineage_id);

-- Insert/edit a new strategy version via transactional supersede + insert.
-- Joins are by strategy_lineage_id, so they automatically survive version bumps.
CREATE OR REPLACE FUNCTION public.strategy_insert_version(p_strategy_id uuid, p_updates jsonb)
RETURNS public.strategies
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_row public.strategies;
  new_row public.strategies;
  now_ts timestamptz := now();
BEGIN
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

-- Soft-delete a strategy lineage (recoverable); joins remain so restore brings links back.
CREATE OR REPLACE FUNCTION public.strategy_soft_delete_lineage(p_lineage_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected int;
BEGIN
  UPDATE public.strategies
  SET deleted_at = now(), updated_at = now()
  WHERE user_id = auth.uid()
    AND lineage_id = p_lineage_id
    AND deleted_at IS NULL;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- Restore a soft-deleted strategy lineage.
CREATE OR REPLACE FUNCTION public.strategy_restore_lineage(p_lineage_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected int;
BEGIN
  UPDATE public.strategies
  SET deleted_at = NULL, updated_at = now()
  WHERE user_id = auth.uid()
    AND lineage_id = p_lineage_id
    AND deleted_at IS NOT NULL;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- Hard-delete a strategy lineage (irreversible): remove strategies + joins.
CREATE OR REPLACE FUNCTION public.strategy_hard_delete_lineage(p_lineage_id uuid)
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

-- Atomic create: inserts strategy row + both join sets in a single function.
-- Enforces 1–3 aims and 1–5 ICP targets.
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

  IF p_aim_lineage_ids IS NULL OR array_length(p_aim_lineage_ids, 1) < 1 OR array_length(p_aim_lineage_ids, 1) > 3 THEN
    RAISE EXCEPTION 'Invalid aims count (need 1-3)';
  END IF;

  IF p_icp_lineage_ids IS NULL OR array_length(p_icp_lineage_ids, 1) < 1 OR array_length(p_icp_lineage_ids, 1) > 5 THEN
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

  IF v_aim_count != array_length(p_aim_lineage_ids, 1) THEN
    RAISE EXCEPTION 'Some aim_lineage_ids are not current for this brand';
  END IF;

  SELECT COUNT(*) INTO v_icp_count
  FROM public.icps
  WHERE user_id = v_user_id
    AND brand_id = p_brand_id
    AND superseded_at IS NULL AND deleted_at IS NULL
    AND lineage_id = ANY(p_icp_lineage_ids);

  IF v_icp_count != array_length(p_icp_lineage_ids, 1) THEN
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

GRANT EXECUTE ON FUNCTION public.strategy_insert_version(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.strategy_soft_delete_lineage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.strategy_restore_lineage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.strategy_hard_delete_lineage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.strategy_create_with_links(uuid, text, jsonb, text[], text, text, uuid[], uuid[]) TO authenticated;

-- Backfill: convert existing icp_strategies rows into first-class strategies and link the ICP target.
-- We intentionally do NOT create strategy_aims during migration (old model had no brand aims linkage).
-- New generation rules (1-3 aims) apply to future creates.
WITH candidates AS (
  SELECT
    s.user_id,
    i.brand_id,
    i.name AS icp_name,
    s.strategy,
    s.channel,
    s.prompt_version,
    s.model,
    s.lineage_id AS strategy_lineage_id
  FROM public.icp_strategies s
  JOIN public.icps i
    ON i.id = s.icp_id
   AND i.user_id = s.user_id
  WHERE i.brand_id IS NOT NULL
)
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
  superseded_at,
  deleted_at,
  created_at,
  updated_at
)
SELECT
  c.user_id,
  c.brand_id,
  c.icp_name || ' strategy',
  c.strategy,
  CASE WHEN c.channel IS NULL THEN NULL ELSE ARRAY[c.channel] END,
  c.prompt_version,
  c.model,
  c.strategy_lineage_id,
  1,
  NULL,
  NULL,
  now(),
  now()
FROM candidates c
WHERE NOT EXISTS (
  SELECT 1
  FROM public.strategies st
  WHERE st.user_id = c.user_id
    AND st.lineage_id = c.strategy_lineage_id
    AND st.superseded_at IS NULL
    AND st.deleted_at IS NULL
);

INSERT INTO public.strategy_targets (
  strategy_lineage_id,
  icp_lineage_id,
  user_id
)
SELECT
  s.lineage_id AS strategy_lineage_id,
  s.lineage_id AS icp_lineage_id,
  s.user_id
FROM public.icp_strategies s
WHERE EXISTS (
  SELECT 1
  FROM public.icps i
  WHERE i.id = s.icp_id
    AND i.user_id = s.user_id
    AND i.brand_id IS NOT NULL
)
ON CONFLICT (strategy_lineage_id, icp_lineage_id) DO NOTHING;

