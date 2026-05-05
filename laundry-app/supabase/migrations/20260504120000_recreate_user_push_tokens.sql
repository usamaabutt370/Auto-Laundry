-- FCM device tokens for chat push (Firebase Cloud Messaging).
-- Recreates table after 20260428184000_remove_push_notifications.sql dropped it.

create table if not exists public.user_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios', 'android')),
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (token)
);

create index if not exists user_push_tokens_user_id_idx
  on public.user_push_tokens (user_id);

create index if not exists user_push_tokens_user_active_idx
  on public.user_push_tokens (user_id)
  where is_active = true;

drop trigger if exists user_push_tokens_set_updated_at on public.user_push_tokens;
create trigger user_push_tokens_set_updated_at
before update on public.user_push_tokens
for each row execute function public.set_updated_at_timestamp();

alter table public.user_push_tokens enable row level security;

drop policy if exists "Push tokens: users can read own"
  on public.user_push_tokens;
create policy "Push tokens: users can read own"
  on public.user_push_tokens for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Push tokens: users can insert own"
  on public.user_push_tokens;
create policy "Push tokens: users can insert own"
  on public.user_push_tokens for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Push tokens: users can update own"
  on public.user_push_tokens;
create policy "Push tokens: users can update own"
  on public.user_push_tokens for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Push tokens: users can delete own"
  on public.user_push_tokens;
create policy "Push tokens: users can delete own"
  on public.user_push_tokens for delete
  to authenticated
  using (auth.uid() = user_id);

-- Upsert by FCM token (same device may switch accounts; plain client upsert hits RLS on owner change).
create or replace function public.register_fcm_push_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if length(trim(p_token)) < 10 then
    raise exception 'Invalid token';
  end if;
  if p_platform not in ('ios', 'android') then
    raise exception 'Invalid platform';
  end if;

  insert into public.user_push_tokens (user_id, token, platform, is_active, last_seen_at)
  values (auth.uid(), trim(p_token), p_platform, true, now())
  on conflict (token) do update
  set user_id = excluded.user_id,
      platform = excluded.platform,
      is_active = true,
      last_seen_at = now(),
      updated_at = now();
end;
$$;

revoke all on function public.register_fcm_push_token(text, text) from public;
grant execute on function public.register_fcm_push_token(text, text) to authenticated;
