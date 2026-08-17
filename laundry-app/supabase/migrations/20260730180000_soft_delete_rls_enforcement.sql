-- Enforce account soft-deletion (Apple Guideline 5.1.1v) across all user data.
--
-- profiles.is_deleted / deactivated_at and public.is_account_active() already
-- exist (see 20260611133000_fix_is_account_active_bootstrap.sql) — that
-- function's coalesce(..., true) fallback for a missing profile row is load
-- bearing (it unblocks first-time profile inserts during signup) and is left
-- untouched here.
--
-- This migration adds the enforcement that was missing:
--   1) is_current_user_deleted() — read by the app to detect its own account
--      was deleted (login.tsx, auth-context.tsx) and sign out immediately.
--   2) A restrictive RLS policy per table, gated by is_account_active(), so a
--      deleted user loses read/write access to every table even though their
--      rows (and the other party's related rows) are left in place.
--   3) register_fcm_push_token stops accepting tokens for deleted accounts.

create or replace function public.is_current_user_deleted()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_deleted from public.profiles where id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_current_user_deleted() from public;
grant execute on function public.is_current_user_deleted() to authenticated;

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
    'customer_order_feedback',
    'order_disputes',
    'partner_riders'
  ]
  loop
    if not exists (
      select 1
      from pg_tables
      where schemaname = 'public' and tablename = t
    ) then
      continue;
    end if;

    execute format('drop policy if exists %I on public.%I', 'Require active account', t);
    execute format(
      'create policy %I on public.%I as restrictive for all to authenticated using (public.is_account_active()) with check (public.is_account_active())',
      'Require active account',
      t
    );
  end loop;
end
$$;

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
    raise exception 'Account deleted';
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
