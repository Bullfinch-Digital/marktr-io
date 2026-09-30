-- LLM fact cache keyed by scraped page text + scorer version.
-- RLS on, no public policies: service-role edge functions only.

CREATE TABLE IF NOT EXISTS public.health_check_fact_cache (
  content_hash text NOT NULL,
  scorer_version text NOT NULL,
  facts jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (content_hash, scorer_version)
);

COMMENT ON TABLE public.health_check_fact_cache IS
  'Cached Health Check LLM facts. Hit when normalised scrape text and scorer version match; Apify metrics are always fetched fresh.';

ALTER TABLE public.health_check_fact_cache ENABLE ROW LEVEL SECURITY;
