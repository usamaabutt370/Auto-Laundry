-- Customers may only discover partners whose business details were approved by admin
-- (partner_onboarding_requests.status = 'approved').
-- Partners still read/update their own rows via existing owner policies.

drop policy if exists "Partner profiles: authenticated can read discovery partners"
  on public.partner_profiles;

create policy "Partner profiles: authenticated can read discovery partners"
  on public.partner_profiles for select
  to authenticated
  using (
    auth.uid() is not null
    and id <> auth.uid()
    and trim(coalesce(business_name, '')) <> ''
    and exists (
      select 1
      from public.partner_onboarding_requests por
      where por.user_id = partner_profiles.id
        and por.status = 'approved'
    )
  );

drop policy if exists "Partner services: authenticated can read discovery partner services"
  on public.partner_services;

create policy "Partner services: authenticated can read discovery partner services"
  on public.partner_services for select
  to authenticated
  using (
    exists (
      select 1
      from public.partner_profiles pp
      inner join public.partner_onboarding_requests por on por.user_id = pp.id
      where pp.id = partner_services.user_id
        and pp.id <> auth.uid()
        and trim(coalesce(pp.business_name, '')) <> ''
        and por.status = 'approved'
    )
  );
