-- Irreversible delete of a soft-archived persona (all versions + related rows).

CREATE OR REPLACE FUNCTION public.icp_hard_delete_lineage(p_lineage_id uuid)
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
    FROM public.icps
    WHERE lineage_id = p_lineage_id
      AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'ICP lineage not found';
  END IF;

  DELETE FROM public.collection_items
  WHERE lineage_id = p_lineage_id;

  DELETE FROM public.icp_strategies
  WHERE lineage_id = p_lineage_id
    AND user_id = v_user_id;

  DELETE FROM public.icps
  WHERE lineage_id = p_lineage_id
    AND user_id = v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.icp_hard_delete_lineage(uuid) TO authenticated;
