create table if not exists public.openai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  model text not null,
  status text not null default 'success',
  icp_id uuid references public.icps(id) on delete set null,
  related_id uuid,
  response_id text,
  input_tokens integer,
  output_tokens integer,
  total_tokens integer,
  reasoning_tokens integer,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists openai_usage_events_user_created_idx
  on public.openai_usage_events (user_id, created_at desc);

create index if not exists openai_usage_events_feature_created_idx
  on public.openai_usage_events (feature, created_at desc);

alter table public.openai_usage_events enable row level security;

create policy "openai_usage_events_select_own"
  on public.openai_usage_events
  for select
  using (auth.uid() = user_id);

create policy "openai_usage_events_insert_own"
  on public.openai_usage_events
  for insert
  with check (auth.uid() = user_id);
