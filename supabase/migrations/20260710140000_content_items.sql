-- Content pillar Stage 1: content_items entity + versioning RPCs.
-- Status stores only draft | approved. Scheduled/published are derived later from Scheduling.

CREATE TABLE IF NOT EXISTS public.content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_lineage_id uuid NOT NULL,
  campaign_idea_id uuid NULL,
  campaign_idea_name_snapshot text NULL,
  icp_lineage_id uuid NOT NULL,
  icp_name_snapshot text NOT NULL,
  suggested_content_id uuid NULL,
  type text NOT NULL,
  title text NOT NULL,
  content jsonb NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  prompt_version text,
  model text,
  lineage_id uuid NOT NULL DEFAULT gen_random_uuid(),
  version int NOT NULL DEFAULT 1,
  superseded_at timestamptz NULL,
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_items_type_check CHECK (
    type IN (
      'ig_single',
      'ig_carousel',
      'ig_story',
      'reel_brief',
      'email',
      'landing_page'
    )
  ),
  CONSTRAINT content_items_status_check CHECK (status IN ('draft', 'approved'))
);

ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_items_select_own"
  ON public.content_items
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "content_items_insert_own"
  ON public.content_items
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "content_items_update_own"
  ON public.content_items
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "content_items_delete_own"
  ON public.content_items
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS content_items_user_brand_idx
  ON public.content_items (user_id, brand_id);

CREATE INDEX IF NOT EXISTS content_items_lineage_idx
  ON public.content_items (lineage_id);

CREATE INDEX IF NOT EXISTS content_items_strategy_lineage_idx
  ON public.content_items (user_id, strategy_lineage_id);

CREATE INDEX IF NOT EXISTS content_items_suggested_content_idx
  ON public.content_items (suggested_content_id)
  WHERE suggested_content_id IS NOT NULL;

CREATE OR REPLACE VIEW public.content_items_current AS
  SELECT *
  FROM public.content_items
  WHERE superseded_at IS NULL AND deleted_at IS NULL;

-- Append-only version bump. Unchanged fields preserved via COALESCE / key-presence
-- (same discipline as strategy_insert_version / aim_insert_version — NOT deep jsonb ||).
CREATE OR REPLACE FUNCTION public.content_insert_version(
  p_item_id uuid,
  p_updates jsonb
)
RETURNS public.content_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_row public.content_items;
  new_row public.content_items;
  now_ts timestamptz := now();
BEGIN
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
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected int;
BEGIN
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
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected int;
BEGIN
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

GRANT EXECUTE ON FUNCTION public.content_insert_version(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.content_soft_delete_lineage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.content_restore_lineage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.content_hard_delete_lineage(uuid) TO authenticated;
