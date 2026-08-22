-- Email-gated PDF downloads for /downloads
-- Admin workflow (no in-app UI):
--   1. Upload the PDF in Storage → bucket `resource-downloads` (keep private).
--   2. Insert a row in Table Editor → `resources` with storage_path matching the
--      object path (e.g. `guides/my-worksheet.pdf`), set published = true to go live.

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  slug text not null,
  storage_path text not null,
  thumbnail_url text null,
  related_video_url text null,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  constraint resources_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create unique index if not exists resources_slug_uidx on public.resources (slug);
create index if not exists resources_published_created_at_idx
  on public.resources (published, created_at desc);

comment on table public.resources is
  'Public downloadable PDFs managed via Table Editor. Only published=true rows appear on /downloads.';
comment on column public.resources.storage_path is
  'Object path inside the private resource-downloads bucket (e.g. guides/worksheet.pdf).';
comment on column public.resources.thumbnail_url is
  'Optional public image URL (not Storage-signed). Paste any https URL.';
comment on column public.resources.related_video_url is
  'Optional YouTube (or other) URL shown as Watch the video.';

alter table public.resources enable row level security;

-- Anon/authenticated may read published rows only. Writes via Dashboard (bypasses RLS).
drop policy if exists "Public can read published resources" on public.resources;
create policy "Public can read published resources"
  on public.resources
  for select
  to anon, authenticated
  using (published = true);

create table if not exists public.resource_leads (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources (id) on delete cascade,
  email text not null,
  -- Same convention as onboarding_leads.email_normalized for exact-match joins.
  email_normalized text generated always as (lower(trim(email))) stored,
  created_at timestamptz not null default now()
);

create index if not exists resource_leads_resource_id_idx on public.resource_leads (resource_id);
create index if not exists resource_leads_email_normalized_idx on public.resource_leads (email_normalized);
create index if not exists resource_leads_created_at_idx on public.resource_leads (created_at desc);

comment on table public.resource_leads is
  'Emails captured when unlocking a resource download. Inserts only via Edge Function (service role).';
comment on column public.resource_leads.email_normalized is
  'lower(trim(email)) — identical to onboarding_leads.email_normalized so the two tables can be joined on exact match.';

alter table public.resource_leads enable row level security;
-- No client policies: service role only.

-- Read-only enrichment for Jon in Table Editor / SQL editor.
-- Does not affect download unlock behaviour (everyone who submits still gets the file).
create or replace view public.resource_leads_enriched
with (security_invoker = true)
as
select
  rl.id,
  rl.resource_id,
  rl.email,
  rl.email_normalized,
  rl.created_at,
  exists (
    select 1
    from public.onboarding_leads ol
    where ol.email_normalized = rl.email_normalized
  ) as is_onboarding_lead,
  (account.user_id is not null) as is_existing_account,
  (
    account.user_id is not null
    and public.user_has_pro_access(account.user_id)
  ) as is_customer
from public.resource_leads rl
left join lateral (
  select coalesce(
    (
      select p.id
      from public.profiles p
      where p.email is not null
        and lower(trim(p.email)) = rl.email_normalized
      limit 1
    ),
    (
      select u.id
      from auth.users u
      where u.email is not null
        and lower(trim(u.email)) = rl.email_normalized
      limit 1
    )
  ) as user_id
) account on true;

comment on view public.resource_leads_enriched is
  'resource_leads plus flags: is_onboarding_lead, is_existing_account, is_customer (active/trialing Pro). Admin review only.';

revoke all on public.resource_leads_enriched from anon, authenticated;
grant select on public.resource_leads_enriched to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resource-downloads',
  'resource-downloads',
  false,
  52428800,
  array['application/pdf']::text[]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Private bucket: no public/anon/authenticated Storage policies.
-- Signed URLs are issued by request-resource-download (service role).
