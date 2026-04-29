-- Allow partners to read customer profile basics for customers
-- that have at least one order assigned to that partner.

create policy "Profiles: partner can read assigned customer profiles"
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1
      from public.customer_orders o
      where o.customer_id = profiles.id
        and o.partner_id = auth.uid()
    )
  );

