-- Let customers read their assigned launderer's partner_profiles row (business name, etc.).
create policy "Partner profiles: customer can read assigned order partner"
  on public.partner_profiles for select
  to authenticated
  using (
    exists (
      select 1 from public.customer_orders o
      where o.partner_id = partner_profiles.id
      and o.customer_id = auth.uid()
    )
  );

-- Broadcast row changes so the customer app can subscribe to live status updates.
-- Filter uses customer_id (not PK); FULL replica identity is required for filtered realtime.
alter table public.customer_orders replica identity full;

alter publication supabase_realtime add table public.customer_orders;
