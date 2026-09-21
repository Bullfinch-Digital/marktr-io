-- Store the plain invite code alongside the hash so operators can see what to
-- send users when viewing rows in Supabase Studio. Signup validation still uses
-- access_code_hash only (see Edge Function beta-signup).
alter table public.beta_invites
  add column if not exists access_code_plain text;

comment on column public.beta_invites.access_code_plain is
  'Plain invite code (same value hashed into access_code_hash). Admin reference in Studio only; do not expose to anon/authenticated clients.';
