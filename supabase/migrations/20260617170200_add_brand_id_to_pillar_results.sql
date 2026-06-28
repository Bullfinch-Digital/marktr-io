-- Scope health + story results to a brand where available.

ALTER TABLE public.health_check_results
  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL;

ALTER TABLE public.brand_story_results
  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS health_check_results_brand_id_idx
  ON public.health_check_results (brand_id);

CREATE INDEX IF NOT EXISTS brand_story_results_brand_id_idx
  ON public.brand_story_results (brand_id);
