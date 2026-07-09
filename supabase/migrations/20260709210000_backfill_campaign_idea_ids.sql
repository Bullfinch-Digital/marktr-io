-- Backfill stable uuid ids on campaign_ideas across all strategy versions.
-- Same idea name within a lineage_id receives the same id across versions.

DO $$
DECLARE
  lineage_rec RECORD;
  row_rec RECORD;
  ideas jsonb;
  new_ideas jsonb;
  idea jsonb;
  i int;
  name_key text;
  idea_id uuid;
  id_map jsonb;
  assigned_this_row jsonb;
BEGIN
  FOR lineage_rec IN
    SELECT DISTINCT lineage_id FROM public.strategies ORDER BY lineage_id
  LOOP
    id_map := '{}'::jsonb;

    FOR row_rec IN
      SELECT id, version, strategy
      FROM public.strategies
      WHERE lineage_id = lineage_rec.lineage_id
      ORDER BY version ASC NULLS LAST, created_at ASC
    LOOP
      ideas := COALESCE(row_rec.strategy->'campaign_ideas', '[]'::jsonb);
      IF jsonb_typeof(ideas) <> 'array' THEN
        CONTINUE;
      END IF;

      new_ideas := '[]'::jsonb;
      assigned_this_row := '{}'::jsonb;

      FOR i IN 0 .. jsonb_array_length(ideas) - 1 LOOP
        idea := ideas->i;
        name_key := lower(trim(COALESCE(idea->>'name', '')));

        IF idea ? 'id' AND NULLIF(trim(idea->>'id'), '') IS NOT NULL THEN
          idea_id := (idea->>'id')::uuid;
        ELSIF name_key <> ''
          AND id_map ? name_key
          AND NOT assigned_this_row ? name_key THEN
          idea_id := (id_map->>name_key)::uuid;
        ELSE
          idea_id := gen_random_uuid();
          IF name_key <> '' AND NOT id_map ? name_key THEN
            id_map := id_map || jsonb_build_object(name_key, idea_id::text);
          END IF;
        END IF;

        IF name_key <> '' THEN
          assigned_this_row := assigned_this_row || jsonb_build_object(name_key, idea_id::text);
        END IF;

        idea := (idea - 'id') || jsonb_build_object('id', idea_id::text);
        new_ideas := new_ideas || jsonb_build_array(idea);
      END LOOP;

      UPDATE public.strategies
      SET strategy = jsonb_set(row_rec.strategy, '{campaign_ideas}', new_ideas, true),
          updated_at = now()
      WHERE id = row_rec.id;
    END LOOP;
  END LOOP;
END;
$$;
