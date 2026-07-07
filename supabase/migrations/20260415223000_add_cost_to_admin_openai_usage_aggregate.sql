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
  with base as (
    select
      feature,
      model,
      status,
      coalesce(input_tokens, 0)::bigint as input_tokens,
      coalesce(output_tokens, 0)::bigint as output_tokens,
      coalesce(total_tokens, 0)::bigint as total_tokens
    from public.openai_usage_events
    where created_at >= since_ts
      and (filter_user_id is null or user_id = filter_user_id)
  ),
  priced as (
    select
      *,
      case lower(model)
        when 'gpt-5.4' then 2.5
        when 'gpt-5.4-mini' then 0.75
        when 'gpt-5.4-nano' then 0.2
        when 'gpt-5.2' then 1.75
        when 'gpt-5.1' then 1.25
        when 'gpt-5' then 1.25
        when 'gpt-5-mini' then 0.25
        when 'gpt-5-nano' then 0.05
        when 'gpt-4.1' then 2
        when 'gpt-4.1-mini' then 0.4
        when 'gpt-4.1-nano' then 0.1
        when 'gpt-4o' then 2.5
        when 'gpt-4o-mini' then 0.15
        when 'o3' then 2
        when 'o4-mini' then 1.1
        else null
      end::numeric as input_rate_per_million,
      case lower(model)
        when 'gpt-5.4' then 15
        when 'gpt-5.4-mini' then 4.5
        when 'gpt-5.4-nano' then 1.25
        when 'gpt-5.2' then 14
        when 'gpt-5.1' then 10
        when 'gpt-5' then 10
        when 'gpt-5-mini' then 2
        when 'gpt-5-nano' then 0.4
        when 'gpt-4.1' then 8
        when 'gpt-4.1-mini' then 1.6
        when 'gpt-4.1-nano' then 0.4
        when 'gpt-4o' then 10
        when 'gpt-4o-mini' then 0.6
        when 'o3' then 8
        when 'o4-mini' then 4.4
        else null
      end::numeric as output_rate_per_million
    from base
  ),
  totals as (
    select
      count(*)::bigint as event_count,
      count(*) filter (where status = 'error')::bigint as error_count,
      coalesce(sum(input_tokens), 0)::bigint as input_tokens,
      coalesce(sum(output_tokens), 0)::bigint as output_tokens,
      coalesce(sum(total_tokens), 0)::bigint as total_tokens,
      coalesce(
        sum(
          case
            when input_rate_per_million is not null and output_rate_per_million is not null
              then (input_tokens * input_rate_per_million + output_tokens * output_rate_per_million) / 1000000.0
            else 0
          end
        ),
        0
      )::numeric as estimated_cost_usd,
      count(*) filter (
        where input_rate_per_million is null or output_rate_per_million is null
      )::bigint as unknown_pricing_events
    from priced
  )
  select jsonb_build_object(
    'totals', (
      select jsonb_build_object(
        'event_count', event_count,
        'error_count', error_count,
        'input_tokens', input_tokens,
        'output_tokens', output_tokens,
        'total_tokens', total_tokens,
        'estimated_cost_usd', round(estimated_cost_usd, 6),
        'unknown_pricing_events', unknown_pricing_events
      )
      from totals
    ),
    'by_feature', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from (
        select
          feature,
          count(*)::bigint as events,
          coalesce(sum(input_tokens), 0)::bigint as input,
          coalesce(sum(output_tokens), 0)::bigint as output,
          coalesce(sum(total_tokens), 0)::bigint as total,
          round(
            coalesce(
              sum(
                case
                  when input_rate_per_million is not null and output_rate_per_million is not null
                    then (input_tokens * input_rate_per_million + output_tokens * output_rate_per_million) / 1000000.0
                  else 0
                end
              ),
              0
            )::numeric,
            6
          ) as estimated_cost_usd,
          count(*) filter (
            where input_rate_per_million is null or output_rate_per_million is null
          )::bigint as unknown_pricing_events
        from priced
        group by feature
        order by events desc
      ) t
    )
  );
$$;
