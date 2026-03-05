-- Partner onboarding and merchant services: one row per user, one row per service.
-- Auth and profiles unchanged; partner-specific data lives here.

-- 1) partner_profiles: business details (onboarding step 1)
create table if not exists public.partner_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  business_name text not null default '',
  business_description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.partner_profiles enable row level security;

create policy "Partner profiles: users can select own row"
  on public.partner_profiles for select
  using (auth.uid() = id);

create policy "Partner profiles: users can insert own row"
  on public.partner_profiles for insert
  with check (auth.uid() = id);

create policy "Partner profiles: users can update own row"
  on public.partner_profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 2) partner_services: one row per service line (Wash & Fold, Dry Cleaning items, etc.)
create table if not exists public.partner_services (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  price_display text not null,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partner_services_user_id_idx on public.partner_services (user_id);

alter table public.partner_services enable row level security;

create policy "Partner services: users can select own rows"
  on public.partner_services for select
  using (auth.uid() = user_id);

create policy "Partner services: users can insert own rows"
  on public.partner_services for insert
  with check (auth.uid() = user_id);

create policy "Partner services: users can update own rows"
  on public.partner_services for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Partner services: users can delete own rows"
  on public.partner_services for delete
  using (auth.uid() = user_id);
