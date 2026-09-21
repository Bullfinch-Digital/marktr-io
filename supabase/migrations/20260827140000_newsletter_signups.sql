-- Footer / site newsletter capture.
-- email_normalized matches onboarding_leads + resource_leads for exact-match joins.

create table if not exists public.newsletter_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  -- Same convention as onboarding_leads.email_normalized for exact-match joins.
  email_normalized text generated always as (lower(trim(email))) stored,
  source text not null default 'footer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists newsletter_signups_email_normalized_uidx
  on public.newsletter_signups (email_normalized);
create index if not exists newsletter_signups_created_at_idx
  on public.newsletter_signups (created_at desc);

comment on table public.newsletter_signups is
  'Newsletter / mailing-list emails from the site footer. Inserts only via Edge Function (service role).';
comment on column public.newsletter_signups.email_normalized is
  'lower(trim(email)) — identical to onboarding_leads / resource_leads for exact-match joins.';

alter table public.newsletter_signups enable row level security;
-- No client policies: service role only.

create or replace view public.newsletter_signups_enriched
with (security_invoker = true)
as
select
  ns.id,
  ns.email,
  ns.email_normalized,
  ns.source,
  ns.created_at,
  ns.updated_at,
  exists (
    select 1
    from public.onboarding_leads ol
    where ol.email_normalized = ns.email_normalized
  ) as is_onboarding_lead,
  exists (
    select 1
    from public.resource_leads rl
    where rl.email_normalized = ns.email_normalized
  ) as is_resource_lead,
  (account.user_id is not null) as is_existing_account,
  (
    account.user_id is not null
    and public.user_has_pro_access(account.user_id)
  ) as is_customer
from public.newsletter_signups ns
left join lateral (
  select coalesce(
    (
      select p.id
      from public.profiles p
      where p.email is not null
        and lower(trim(p.email)) = ns.email_normalized
      limit 1
    ),
    (
      select u.id
      from auth.users u
      where u.email is not null
        and lower(trim(u.email)) = ns.email_normalized
      limit 1
    )
  ) as user_id
) account on true;

comment on view public.newsletter_signups_enriched is
  'newsletter_signups plus flags vs onboarding/resource funnels and Pro customers. Admin review only.';

revoke all on public.newsletter_signups_enriched from anon, authenticated;
grant select on public.newsletter_signups_enriched to service_role;
