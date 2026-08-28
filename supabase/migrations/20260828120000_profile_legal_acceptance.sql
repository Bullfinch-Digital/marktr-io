-- Record when users accept Terms / Privacy at signup (UK contract + GDPR audit trail).

alter table public.profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists privacy_accepted_at timestamptz,
  add column if not exists legal_version text;

comment on column public.profiles.terms_accepted_at is
  'UTC timestamp when the user accepted Terms of Use.';
comment on column public.profiles.privacy_accepted_at is
  'UTC timestamp when the user accepted the Privacy Policy.';
comment on column public.profiles.legal_version is
  'Version string of the legal documents accepted at signup.';
