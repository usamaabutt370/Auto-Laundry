-- Soft delete: deactivate accounts while preserving orders, chats, and auth identity.

alter table public.profiles
  add column if not exists deactivated_at timestamptz;

comment on column public.profiles.deactivated_at is
  'When set, the account is deactivated. Sign in again to reactivate and restore access to historical data.';

create or replace function public.is_account_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select deactivated_at is null from public.profiles where id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_account_active() from public;
grant execute on function public.is_account_active() to authenticated, anon;

create or replace function public.reactivate_current_user()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.profiles
  set deactivated_at = null,
      updated_at = now()
  where id = auth.uid();
end;
$$;

revoke all on function public.reactivate_current_user() from public;
grant execute on function public.reactivate_current_user() to authenticated;

create or replace function public.is_current_user_deactivated()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select deactivated_at is not null from public.profiles where id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_current_user_deactivated() from public;
grant execute on function public.is_current_user_deactivated() to authenticated;

-- Restrictive RLS: deactivated users cannot access app data (anon phone lookup unchanged).
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles',
    'partner_profiles',
    'partner_services',
    'customer_orders',
    'order_services',
    'order_service_items',
    'chat_conversations',
    'chat_conversation_participants',
    'chat_messages',
    'user_push_tokens',
    'partner_credit_accounts',
    'partner_credit_ledger',
    'partner_onboarding_requests',
    'partner_dashboard_stats',
    'customer_order_feedback'
  ]
  loop
    if not exists (
      select 1
      from pg_tables
      where schemaname = 'public' and tablename = t
    ) then
      continue;
    end if;

    execute format(
      'drop policy if exists %I on public.%I',
      'Require active account',
      t
    );
    execute format(
      'create policy %I on public.%I as restrictive for all to authenticated using (public.is_account_active()) with check (public.is_account_active())',
      'Require active account',
      t
    );
  end loop;
end $$;

-- Block push registration for deactivated accounts.
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
  if not public.is_account_active() then
    raise exception 'Account deactivated';
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
