-- Store Expo push tokens per user/device for chat notifications.

create table if not exists public.user_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_push_tokens_user_id_idx
  on public.user_push_tokens (user_id);

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

drop policy if exists "Push tokens: users can upsert own"
  on public.user_push_tokens;
create policy "Push tokens: users can upsert own"
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
