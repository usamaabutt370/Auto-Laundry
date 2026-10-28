-- Landing testimonials: expose customer display name + avatar (not initials-only).

drop function if exists public.landing_public_reviews(integer);

create or replace function public.landing_public_reviews(p_limit integer default 12)
returns table (
  id uuid,
  rating integer,
  message text,
  created_at timestamptz,
  reviewer_initial text,
  reviewer_name text,
  reviewer_image_url text,
  location_label text,
  partner_id uuid,
  business_name text
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
    )) as reviewer_initial,
    coalesce(
      nullif(trim(p.full_name), ''),
      nullif(trim(p.first_name), ''),
      'Customer'
    ) as reviewer_name,
    nullif(trim(p.image_url), '') as reviewer_image_url,
    coalesce(
      nullif(trim(reverse(split_part(reverse(coalesce(p.address, '')), ',', 1))), ''),
      nullif(trim(p.address), ''),
      'Nearby'
    ) as location_label,
    f.partner_id,
    coalesce(nullif(trim(pp.business_name), ''), 'Local provider') as business_name
  from public.customer_order_feedback f
  left join public.profiles p on p.id = f.customer_id
  join public.partner_profiles pp on pp.id = f.partner_id
  where f.feedback_type = 'feedback'
    and length(trim(coalesce(f.message, ''))) > 0
    and trim(coalesce(pp.business_name, '')) <> ''
    and exists (
      select 1
      from public.partner_onboarding_requests por
      where por.user_id = pp.id
        and por.status = 'approved'
    )
  order by f.created_at desc
  limit greatest(1, least(coalesce(p_limit, 12), 24));
$$;

revoke all on function public.landing_public_reviews(integer) from public;
grant execute on function public.landing_public_reviews(integer) to anon, authenticated;
