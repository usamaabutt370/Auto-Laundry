-- Create a public bucket for profile avatars (if your Supabase version supports it).
-- If this insert fails, create the bucket manually: Dashboard → Storage → New bucket → id/name: avatars, Public: true.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- RLS: allow authenticated users to upload only to their own folder: {user_id}/...
create policy "Avatars: users can upload own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- RLS: allow users to update/delete only their own files in avatars
create policy "Avatars: users can update own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Avatars: users can delete own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- RLS: allow anyone to read (so public profile image URLs work)
create policy "Avatars: public read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'avatars');
