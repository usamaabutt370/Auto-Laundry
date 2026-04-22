-- Partner business gallery images (up to 10 on app side)
-- Stored as public URLs in partner_profiles.business_images.

alter table public.partner_profiles
  add column if not exists business_images jsonb not null default '[]'::jsonb;

insert into storage.buckets (id, name, public)
values ('business-images', 'business-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Business images: users can upload own" on storage.objects;
create policy "Business images: users can upload own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'business-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Business images: users can update own" on storage.objects;
create policy "Business images: users can update own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'business-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'business-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Business images: users can delete own" on storage.objects;
create policy "Business images: users can delete own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'business-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Business images: public read" on storage.objects;
create policy "Business images: public read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'business-images');
