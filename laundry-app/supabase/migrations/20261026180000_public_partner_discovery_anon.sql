-- Allow signed-out web visitors to browse verified partners (landing marketplace).
-- Mirrors authenticated discovery: non-empty business name + approved onboarding.

drop policy if exists "Partner profiles: anon can read verified discovery partners"
  on public.partner_profiles;

create policy "Partner profiles: anon can read verified discovery partners"
  on public.partner_profiles
  for select
  to anon
  using (
    trim(coalesce(business_name, '')) <> ''
    and exists (
      select 1
      from public.partner_onboarding_requests por
      where por.user_id = partner_profiles.id
        and por.status = 'approved'
    )
  );

drop policy if exists "Partner services: anon can read discovery partner services"
  on public.partner_services;

create policy "Partner services: anon can read discovery partner services"
  on public.partner_services
  for select
  to anon
  using (
    exists (
      select 1
      from public.partner_profiles pp
      where pp.id = partner_services.user_id
        and trim(coalesce(pp.business_name, '')) <> ''
        and exists (
          select 1
          from public.partner_onboarding_requests por
          where por.user_id = pp.id
            and por.status = 'approved'
        )
    )
  );

drop policy if exists "Partner onboarding requests: anon can read approved requests"
  on public.partner_onboarding_requests;

create policy "Partner onboarding requests: anon can read approved requests"
  on public.partner_onboarding_requests
  for select
  to anon
  using (status = 'approved');

grant execute on function public.partner_rating_stats(uuid[]) to anon;
