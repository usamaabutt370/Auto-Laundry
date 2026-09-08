-- Aggregated partner ratings for customer discovery.
-- Customers cannot read other people's feedback rows, so this SECURITY DEFINER
-- function returns only average + count (no messages) for the requested ids.

create or replace function public.partner_rating_stats(partner_ids uuid[])
returns table (
  partner_id uuid,
  avg_rating numeric,
  review_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    f.partner_id,
    round(avg(f.rating)::numeric, 1) as avg_rating,
    count(*)::integer as review_count
  from public.customer_order_feedback f
  where partner_ids is not null
    and f.partner_id = any(partner_ids)
  group by f.partner_id
$$;

revoke all on function public.partner_rating_stats(uuid[]) from public;
grant execute on function public.partner_rating_stats(uuid[]) to authenticated;
