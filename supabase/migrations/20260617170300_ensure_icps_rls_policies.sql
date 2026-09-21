-- Production icps may predate baseline RLS policies; health/story use FOR ALL but icps may not.
ALTER TABLE public.icps ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'icps'
      AND policyname = 'Users can manage own icps'
  ) THEN
    CREATE POLICY "Users can manage own icps"
      ON public.icps
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
