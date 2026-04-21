-- Expand customer discovery RLS to support both fulfillment modes.
-- Previous policies only exposed pickup-enabled partners/services.

drop policy if exists "Partner profiles: authenticated can read pickup partners"
  on public.partner_profiles;

create policy "Partner profiles: authenticated can read discovery partners"
  on public.partner_profiles for select
  to authenticated
  using (
    auth.uid() is not null
    and id <> auth.uid()
    and trim(coalesce(business_name, '')) <> ''
  );

drop policy if exists "Partner services: authenticated can read pickup partner services"
  on public.partner_services;

create policy "Partner services: authenticated can read discovery partner services"
  on public.partner_services for select
  to authenticated
  using (
    exists (
      select 1
      from public.partner_profiles pp
      where pp.id = partner_services.user_id
        and pp.id <> auth.uid()
        and trim(coalesce(pp.business_name, '')) <> ''
    )
  );
