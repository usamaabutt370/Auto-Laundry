-- Optional image attachments in order chat (public URLs in chat_messages.image_url).

-- Relax body constraint: allow null/empty body when image_url is set.
do $$
declare
  cname text;
begin
  for cname in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'chat_messages'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%body%'
  loop
    execute format('alter table public.chat_messages drop constraint %I', cname);
  end loop;
end
$$;

alter table public.chat_messages
  add column if not exists image_url text;

alter table public.chat_messages
  alter column body drop not null;

alter table public.chat_messages
  add constraint chat_messages_text_or_image_check check (
    length(trim(coalesce(body, ''))) > 0
    or (image_url is not null and length(trim(image_url)) > 0)
  );

-- Public bucket for chat images (URLs stored on messages; same read model as avatars).
insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Chat images: users can upload own prefix" on storage.objects;
create policy "Chat images: users can upload own prefix"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'chat-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Chat images: users can update own prefix" on storage.objects;
create policy "Chat images: users can update own prefix"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'chat-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'chat-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Chat images: users can delete own prefix" on storage.objects;
create policy "Chat images: users can delete own prefix"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'chat-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Chat images: public read" on storage.objects;
create policy "Chat images: public read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'chat-images');
