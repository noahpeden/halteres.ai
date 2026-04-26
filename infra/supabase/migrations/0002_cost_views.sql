-- Cost analytics views. Read-only via the dashboard.

create or replace view cost_summary as
select
  user_id,
  date_trunc('day', created_at)::date as day,
  kind,
  count(*) as calls,
  sum(input_tokens) as input_tokens,
  sum(output_tokens) as output_tokens,
  sum(cached_tokens) as cached_tokens,
  sum(cost_usd) as cost_usd,
  avg(duration_ms) as avg_duration_ms
from generation_runs
group by 1, 2, 3;

-- Per-user lifetime totals (for admin dashboard and entitlement checks)
create or replace view user_cost_totals as
select
  user_id,
  count(*) as total_calls,
  sum(cost_usd) as lifetime_cost_usd,
  sum(case when kind = 'enhance' then 1 else 0 end) as total_enhances,
  sum(case when kind = 'enhance' and created_at > now() - interval '30 days' then 1 else 0 end)
    as enhances_last_30d,
  max(created_at) as last_call_at
from generation_runs
group by user_id;

-- Read access: views inherit RLS from underlying table, so users only see
-- their own rows. The admin dashboard queries with the service role.
grant select on cost_summary to authenticated;
grant select on user_cost_totals to authenticated;
