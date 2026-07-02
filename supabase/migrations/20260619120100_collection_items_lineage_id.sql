-- collection_items: key on lineage_id (stable across ICP versions)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'collection_items'
  ) THEN
    ALTER TABLE public.collection_items
      ADD COLUMN IF NOT EXISTS lineage_id uuid;

    UPDATE public.collection_items ci
    SET lineage_id = i.lineage_id
    FROM public.icps i
    WHERE ci.lineage_id IS NULL
      AND ci.icp_id IS NOT NULL
      AND ci.icp_id = i.id;

    DELETE FROM public.collection_items WHERE lineage_id IS NULL;

    ALTER TABLE public.collection_items
      ALTER COLUMN lineage_id SET NOT NULL;

    ALTER TABLE public.collection_items
      DROP COLUMN IF EXISTS icp_id;

    CREATE UNIQUE INDEX IF NOT EXISTS collection_items_collection_lineage_uidx
      ON public.collection_items (collection_id, lineage_id);
  END IF;
END $$;
