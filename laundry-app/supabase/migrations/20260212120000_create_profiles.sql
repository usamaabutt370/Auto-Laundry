-- Create profiles table to store user details and support phone + password login.
-- This table is linked 1:1 with auth.users via id.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  phone text not null,
  full_name text,
  first_name text,
  last_name text,
  role text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure each phone is unique so we can reliably map phone -> email.
create unique index if not exists profiles_phone_key on public.profiles (phone);

-- Optional: enforce unique email at the profile level too.
create unique index if not exists profiles_email_key on public.profiles (email);

-- Enable Row Level Security.
alter table public.profiles enable row level security;

-- Policy: authenticated users can see and manage their own profile.
create policy "Profiles: users can select own row"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "Profiles: users can insert own row"
  on public.profiles
  for insert
  with check (auth.uid() = id);

create policy "Profiles: users can update own row"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- IMPORTANT for current app flow:
-- The mobile app looks up email by phone BEFORE the user is authenticated,
-- using the anon key. To allow this, we add a permissive policy for anon.
-- This makes phone -> email mapping publicly readable; if you want stricter
-- security, move this lookup into a Supabase Edge Function that uses the
-- service role key instead, and remove this policy.

create policy "Profiles: anon can lookup email by phone"
  on public.profiles
  for select
  to anon
  using (true);

