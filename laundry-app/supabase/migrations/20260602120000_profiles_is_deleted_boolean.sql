-- Soft delete via is_deleted boolean (login blocked; reactivate on sign-up).

alter table public.profiles
  add column if not exists is_deleted boolean not null default false;

comment on column public.profiles.is_deleted is
  'When true, account is deleted (soft). Data retained; user must sign up again with same phone to restore.';

-- Backfill from legacy deactivated_at if present.
update public.profiles
set is_deleted = true
where deactivated_at is not null and is_deleted = false;

create or replace function public.is_account_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select not is_deleted from public.profiles where id = auth.uid()),
    false
  );
$$;

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

-- Drop login-time reactivation; sign-up edge function handles restore.
drop function if exists public.reactivate_current_user();

drop function if exists public.is_current_user_deactivated();

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
