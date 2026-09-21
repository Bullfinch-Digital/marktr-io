-- Key icp_strategies on lineage_id (persona) instead of row id.

ALTER TABLE public.icp_strategies
  ADD COLUMN IF NOT EXISTS lineage_id uuid;

UPDATE public.icp_strategies s
SET lineage_id = i.lineage_id
FROM public.icps i
WHERE s.lineage_id IS NULL
  AND s.icp_id = i.id;

DELETE FROM public.icp_strategies WHERE lineage_id IS NULL;

ALTER TABLE public.icp_strategies
  ALTER COLUMN lineage_id SET NOT NULL;

DROP INDEX IF EXISTS public.icp_strategies_icp_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS icp_strategies_lineage_id_key
  ON public.icp_strategies (lineage_id);

-- icp_id kept as optional reference to the row that last generated the strategy.
