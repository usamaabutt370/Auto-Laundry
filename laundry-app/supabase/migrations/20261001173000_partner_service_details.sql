-- Per-service details that are not price lines:
-- gallery image URLs, plus tailoring service types and measurement mode.
-- Item prices and Express Service stay on partner_services.
-- Pickup & delivery stays on partner_profiles.pickup_delivery_enabled.

create table if not exists public.partner_service_details (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null
    check (category in ('Wash & Fold', 'Dry Cleaning', 'Press', 'Tailoring')),
  images jsonb not null default '[]'::jsonb,
  service_types text[] not null default '{}',
  measurement_mode text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_service_details_user_category_key unique (user_id, category),
  constraint partner_service_details_measurement_mode_check
    check (measurement_mode is null or measurement_mode in ('customer', 'provider')),
  constraint partner_service_details_service_types_check
    check (service_types <@ array['stitching', 'alteration', 'custom']::text[]),
  constraint partner_service_details_tailoring_only_check
    check (
      category = 'Tailoring'
      or (service_types = '{}' and measurement_mode is null)
    )
);

create index if not exists partner_service_details_user_id_idx
  on public.partner_service_details (user_id);

alter table public.partner_service_details enable row level security;

drop policy if exists "Partner service details: users can select own rows"
  on public.partner_service_details;
create policy "Partner service details: users can select own rows"
  on public.partner_service_details for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Partner service details: users can insert own rows"
  on public.partner_service_details;
create policy "Partner service details: users can insert own rows"
  on public.partner_service_details for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Partner service details: users can update own rows"
  on public.partner_service_details;
create policy "Partner service details: users can update own rows"
  on public.partner_service_details for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Partner service details: users can delete own rows"
  on public.partner_service_details;
create policy "Partner service details: users can delete own rows"
  on public.partner_service_details for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Partner service details: authenticated can read discovery rows"
  on public.partner_service_details;
create policy "Partner service details: authenticated can read discovery rows"
  on public.partner_service_details for select
  to authenticated
  using (
    exists (
      select 1
      from public.partner_profiles pp
      where pp.id = partner_service_details.user_id
        and pp.id <> auth.uid()
        and trim(coalesce(pp.business_name, '')) <> ''
    )
  );

drop policy if exists "Require active account" on public.partner_service_details;
create policy "Require active account"
  on public.partner_service_details
  as restrictive
  for all
  to authenticated
  using (public.is_account_active())
  with check (public.is_account_active());

-- Public gallery for service photos. Object path must start with the owner's uid.
insert into storage.buckets (id, name, public)
values ('service-images', 'service-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Service images: users can upload own" on storage.objects;
create policy "Service images: users can upload own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'service-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Service images: users can update own" on storage.objects;
create policy "Service images: users can update own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'service-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'service-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Service images: users can delete own" on storage.objects;
create policy "Service images: users can delete own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'service-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Service images: public read" on storage.objects;
create policy "Service images: public read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'service-images');
