drop index if exists public.icp_strategies_icp_id_key;

create index if not exists icp_strategies_icp_id_created_idx
  on public.icp_strategies (icp_id, created_at desc);
