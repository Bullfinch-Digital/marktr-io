-- Health check results
CREATE TABLE IF NOT EXISTS public.health_check_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  domain text,
  instagram_handle text,
  facebook_url text,
  overall_score integer,
  scores jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.health_check_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own health checks"
  ON public.health_check_results
  FOR ALL USING (auth.uid() = user_id);

-- Brand story results
CREATE TABLE IF NOT EXISTS public.brand_story_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  story_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.brand_story_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own brand stories"
  ON public.brand_story_results
  FOR ALL USING (auth.uid() = user_id);
