-- Aggregated OpenAI usage for admin dashboards (Edge Functions use service_role only).

create or replace function public.admin_openai_usage_aggregate(
  since_ts timestamptz,
  filter_user_id uuid default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'totals', (
      select jsonb_build_object(
        'event_count', count(*)::bigint,
        'error_count', count(*) filter (where status = 'error')::bigint,
        'input_tokens', coalesce(sum(coalesce(input_tokens, 0)), 0)::bigint,
        'output_tokens', coalesce(sum(coalesce(output_tokens, 0)), 0)::bigint,
        'total_tokens', coalesce(sum(coalesce(total_tokens, 0)), 0)::bigint
      )
      from public.openai_usage_events
      where created_at >= since_ts
        and (filter_user_id is null or user_id = filter_user_id)
    ),
    'by_feature', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from (
        select
          feature,
          count(*)::bigint as events,
          coalesce(sum(coalesce(input_tokens, 0)), 0)::bigint as input,
          coalesce(sum(coalesce(output_tokens, 0)), 0)::bigint as output,
          coalesce(sum(coalesce(total_tokens, 0)), 0)::bigint as total
        from public.openai_usage_events
        where created_at >= since_ts
          and (filter_user_id is null or user_id = filter_user_id)
        group by feature
      ) t
    )
  );
$$;

revoke all on function public.admin_openai_usage_aggregate(timestamptz, uuid) from public;
grant execute on function public.admin_openai_usage_aggregate(timestamptz, uuid) to service_role;
