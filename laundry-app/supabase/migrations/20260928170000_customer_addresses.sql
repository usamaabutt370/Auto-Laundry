-- Customer saved pickup / delivery addresses.

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users (id) on delete cascade,
  label text not null default 'Home',
  address_line text not null default '',
  icon text not null default 'home'
    check (icon in ('home', 'office', 'other')),
  is_default boolean not null default false,
  use_for_pickup boolean not null default true,
  use_for_delivery boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_addresses_customer_idx
  on public.customer_addresses (customer_id, is_default desc, created_at desc);

drop trigger if exists customer_addresses_set_updated_at on public.customer_addresses;
create trigger customer_addresses_set_updated_at
before update on public.customer_addresses
for each row execute function public.set_updated_at_timestamp();

-- Keep at most one default address per customer.
create unique index if not exists customer_addresses_one_default_idx
  on public.customer_addresses (customer_id)
  where is_default;

alter table public.customer_addresses enable row level security;

drop policy if exists "Customer addresses: owner can read"
  on public.customer_addresses;
create policy "Customer addresses: owner can read"
  on public.customer_addresses for select
  to authenticated
  using (customer_id = auth.uid());

drop policy if exists "Customer addresses: owner can insert"
  on public.customer_addresses;
create policy "Customer addresses: owner can insert"
  on public.customer_addresses for insert
  to authenticated
  with check (customer_id = auth.uid());

drop policy if exists "Customer addresses: owner can update"
  on public.customer_addresses;
create policy "Customer addresses: owner can update"
  on public.customer_addresses for update
  to authenticated
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

drop policy if exists "Customer addresses: owner can delete"
  on public.customer_addresses;
create policy "Customer addresses: owner can delete"
  on public.customer_addresses for delete
  to authenticated
  using (customer_id = auth.uid());
