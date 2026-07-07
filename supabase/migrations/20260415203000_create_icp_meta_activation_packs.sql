create table if not exists public.icp_meta_activation_packs (
  id uuid primary key default gen_random_uuid(),
  icp_id uuid not null references public.icps(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  strategy_id uuid references public.icp_strategies(id) on delete set null,
  pack_name text not null,
  goal text,
  pack_json jsonb not null,
  prompt_version text not null,
  model text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists icp_meta_activation_packs_icp_created_idx
  on public.icp_meta_activation_packs (icp_id, created_at desc);

create index if not exists icp_meta_activation_packs_user_created_idx
  on public.icp_meta_activation_packs (user_id, created_at desc);

alter table public.icp_meta_activation_packs enable row level security;

create policy "icp_meta_activation_packs_select_own"
  on public.icp_meta_activation_packs
  for select
  using (auth.uid() = user_id);

create policy "icp_meta_activation_packs_insert_own"
  on public.icp_meta_activation_packs
  for insert
  with check (auth.uid() = user_id);

create policy "icp_meta_activation_packs_update_own"
  on public.icp_meta_activation_packs
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "icp_meta_activation_packs_delete_own"
  on public.icp_meta_activation_packs
  for delete
  using (auth.uid() = user_id);
