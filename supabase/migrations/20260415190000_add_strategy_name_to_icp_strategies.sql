alter table public.icp_strategies
  add column if not exists strategy_name text;

with numbered as (
  select
    id,
    row_number() over (
      partition by icp_id
      order by created_at asc, id asc
    ) as strategy_idx
  from public.icp_strategies
)
update public.icp_strategies s
set strategy_name = concat('Strategy ', numbered.strategy_idx)
from numbered
where s.id = numbered.id
  and (s.strategy_name is null or btrim(s.strategy_name) = '');
