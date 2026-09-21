-- Public review snippets for the launderer detail screen.
-- Customers cannot read other people's feedback rows, so this SECURITY DEFINER
-- function returns rating, message, date, and a single initial (no identity).

create or replace function public.partner_public_reviews(
  p_partner_id uuid,
  p_limit integer default 20
)
returns table (
  id uuid,
  rating integer,
  message text,
  created_at timestamptz,
  reviewer_initial text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    f.id,
    f.rating,
    left(trim(f.message), 280) as message,
    f.created_at,
    upper(left(
      coalesce(
        nullif(trim(p.first_name), ''),
        nullif(trim(split_part(coalesce(p.full_name, ''), ' ', 1)), ''),
        'C'
      ),
      1
    )) as reviewer_initial
  from public.customer_order_feedback f
  left join public.profiles p on p.id = f.customer_id
  where p_partner_id is not null
    and f.partner_id = p_partner_id
    and f.feedback_type = 'feedback'
  order by f.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;

revoke all on function public.partner_public_reviews(uuid, integer) from public;
grant execute on function public.partner_public_reviews(uuid, integer) to authenticated;
grant execute on function public.partner_public_reviews(uuid, integer) to anon;
