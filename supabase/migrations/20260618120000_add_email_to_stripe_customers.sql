ALTER TABLE public.stripe_customers
  ADD COLUMN IF NOT EXISTS email text;

CREATE INDEX IF NOT EXISTS stripe_customers_email_idx
  ON public.stripe_customers (lower(email))
  WHERE email IS NOT NULL;
