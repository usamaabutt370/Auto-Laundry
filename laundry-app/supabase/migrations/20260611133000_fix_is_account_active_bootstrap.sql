-- Fix chicken-and-egg: is_account_active() returned false when no profiles row
-- exists yet, which blocked the first profiles insert and partner onboarding saves.

alter table public.profiles
  add column if not exists is_deleted boolean not null default false;

alter table public.profiles
  add column if not exists deactivated_at timestamptz;

create or replace function public.is_account_active()
returns boolean
language sql
stable
security definer
set search_path to public
as $$
  select coalesce(
    (select not is_deleted from public.profiles where id = auth.uid()),
    true
  );
$$;

-- Bootstrap profiles without hitting the restrictive RLS policy on first insert.
create or replace function public.bootstrap_user_profile(
  p_email text,
  p_phone text,
  p_full_name text default null,
  p_first_name text default null,
  p_last_name text default null,
  p_role text default 'customer'
)
returns void
language plpgsql
security definer
set search_path to public
as $$
declare
  v_user_id uuid := auth.uid();
  v_deleted boolean;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select is_deleted
  into v_deleted
  from public.profiles
  where id = v_user_id;

  if found and v_deleted then
    raise exception 'Account deactivated';
  end if;

  insert into public.profiles (
    id,
    email,
    phone,
    full_name,
    first_name,
    last_name,
    role,
    is_deleted,
    updated_at
  )
  values (
    v_user_id,
    p_email,
    p_phone,
    nullif(trim(coalesce(p_full_name, '')), ''),
    nullif(trim(coalesce(p_first_name, '')), ''),
    nullif(trim(coalesce(p_last_name, '')), ''),
    coalesce(nullif(trim(p_role), ''), 'customer'),
    false,
    now()
  )
  on conflict (id) do update
  set
    email = excluded.email,
    phone = excluded.phone,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    first_name = coalesce(excluded.first_name, public.profiles.first_name),
    last_name = coalesce(excluded.last_name, public.profiles.last_name),
    is_deleted = false,
    updated_at = now()
  where public.profiles.is_deleted = false;
end;
$$;

revoke all on function public.bootstrap_user_profile(text, text, text, text, text, text) from public;
grant execute on function public.bootstrap_user_profile(text, text, text, text, text, text) to authenticated;
