-- Customer favourite / saved service providers.

create table if not exists public.customer_favourite_providers (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users (id) on delete cascade,
  partner_id uuid not null references public.partner_profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (customer_id, partner_id)
);

create index if not exists customer_favourite_providers_customer_idx
  on public.customer_favourite_providers (customer_id, created_at desc);

create index if not exists customer_favourite_providers_partner_idx
  on public.customer_favourite_providers (partner_id);

alter table public.customer_favourite_providers enable row level security;

drop policy if exists "Favourite providers: customer can read own"
  on public.customer_favourite_providers;
create policy "Favourite providers: customer can read own"
  on public.customer_favourite_providers for select
  to authenticated
  using (customer_id = auth.uid());

drop policy if exists "Favourite providers: customer can insert own"
  on public.customer_favourite_providers;
create policy "Favourite providers: customer can insert own"
  on public.customer_favourite_providers for insert
  to authenticated
  with check (customer_id = auth.uid());

drop policy if exists "Favourite providers: customer can delete own"
  on public.customer_favourite_providers;
create policy "Favourite providers: customer can delete own"
  on public.customer_favourite_providers for delete
  to authenticated
  using (customer_id = auth.uid());
