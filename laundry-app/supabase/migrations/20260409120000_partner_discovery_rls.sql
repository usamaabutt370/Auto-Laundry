-- Allow customers (authenticated, not the row owner) to read partner_profiles for
-- pickup & delivery discovery: partners with pickup enabled and a non-empty business name.
create policy "Partner profiles: authenticated can read pickup partners"
  on public.partner_profiles for select
  to authenticated
  using (
    auth.uid() is not null
    and id <> auth.uid()
    and coalesce(pickup_delivery_enabled, false) = true
    and trim(coalesce(business_name, '')) <> ''
  );

-- Allow customers to read partner_services for partners who offer pickup (detail screen).
create policy "Partner services: authenticated can read pickup partner services"
  on public.partner_services for select
  to authenticated
  using (
    exists (
      select 1 from public.partner_profiles pp
      where pp.id = partner_services.user_id
      and coalesce(pp.pickup_delivery_enabled, false) = true
    )
  );
