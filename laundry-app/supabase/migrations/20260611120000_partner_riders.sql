-- Partner-owned pickup riders (name, phone, face photo) for laundromat registration.

alter table public.partner_profiles
  add column if not exists riders_responsibility_accepted_at timestamptz;

create table if not exists public.partner_riders (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references auth.users (id) on delete cascade,
  name text not null default '',
  phone text not null default '',
  photo_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partner_riders_partner_id_idx on public.partner_riders (partner_id);

alter table public.partner_riders enable row level security;

drop policy if exists "Partner riders: users can select own rows" on public.partner_riders;
create policy "Partner riders: users can select own rows"
  on public.partner_riders for select
  using (auth.uid() = partner_id);

drop policy if exists "Partner riders: users can insert own rows" on public.partner_riders;
create policy "Partner riders: users can insert own rows"
  on public.partner_riders for insert
  with check (auth.uid() = partner_id);

drop policy if exists "Partner riders: users can update own rows" on public.partner_riders;
create policy "Partner riders: users can update own rows"
  on public.partner_riders for update
  using (auth.uid() = partner_id)
  with check (auth.uid() = partner_id);

drop policy if exists "Partner riders: users can delete own rows" on public.partner_riders;
create policy "Partner riders: users can delete own rows"
  on public.partner_riders for delete
  using (auth.uid() = partner_id);

insert into storage.buckets (id, name, public)
values ('rider-photos', 'rider-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "Rider photos: users can upload own" on storage.objects;
create policy "Rider photos: users can upload own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'rider-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Rider photos: users can update own" on storage.objects;
create policy "Rider photos: users can update own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'rider-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'rider-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Rider photos: users can delete own" on storage.objects;
create policy "Rider photos: users can delete own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'rider-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Rider photos: public read" on storage.objects;
create policy "Rider photos: public read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'rider-photos');
