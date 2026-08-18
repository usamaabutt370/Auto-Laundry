-- Step 2: Auto-generate referral codes + attach referral on signup (RPC).
-- Product: pending referral only; points awarded later (Step 3) on first completed order.

-- ---------------------------------------------------------------------------
-- Unique 8-char referral code generator (A-Z / 2-9, skip ambiguous 0/O/1/I)
-- ---------------------------------------------------------------------------
create or replace function public.generate_unique_referral_code()
returns text
language plpgsql
security definer
set search_path to public
as $$
declare
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_i int;
  v_attempt int := 0;
begin
  loop
    v_attempt := v_attempt + 1;
    if v_attempt > 50 then
      raise exception 'Could not generate a unique referral code';
    end if;

    v_code := '';
    for v_i in 1..8 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;

    exit when not exists (
      select 1 from public.profiles p where p.referral_code = v_code
    );
  end loop;

  return v_code;
end;
$$;

revoke all on function public.generate_unique_referral_code() from public;

-- Assign a code when a profile is inserted/updated without one.
create or replace function public.profiles_assign_referral_code()
returns trigger
language plpgsql
security definer
set search_path to public
as $$
begin
  if new.referral_code is null or length(trim(new.referral_code)) = 0 then
    new.referral_code := public.generate_unique_referral_code();
  else
    new.referral_code := upper(trim(new.referral_code));
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_assign_referral_code_trg on public.profiles;
create trigger profiles_assign_referral_code_trg
before insert or update of referral_code
on public.profiles
for each row
execute function public.profiles_assign_referral_code();

-- Backfill existing rows (safe on empty Dev; needed before prod).
do $$
declare
  r record;
begin
  for r in
    select id from public.profiles where referral_code is null
  loop
    update public.profiles
    set referral_code = public.generate_unique_referral_code()
    where id = r.id;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Attach a referral code for the signed-in user (pending; no points yet)
-- ---------------------------------------------------------------------------
create or replace function public.attach_referral_code(p_code text)
returns void
language plpgsql
security definer
set search_path to public
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text := upper(trim(coalesce(p_code, '')));
  v_referrer_id uuid;
  v_existing_referred_by uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if v_code = '' then
    return;
  end if;

  if length(v_code) < 6 or length(v_code) > 8 then
    raise exception 'Invalid referral code';
  end if;

  select id
  into v_referrer_id
  from public.profiles
  where referral_code = v_code
  limit 1;

  if v_referrer_id is null then
    raise exception 'Referral code not found';
  end if;

  if v_referrer_id = v_user_id then
    raise exception 'You cannot use your own referral code';
  end if;

  select referred_by
  into v_existing_referred_by
  from public.profiles
  where id = v_user_id;

  if v_existing_referred_by is not null then
    raise exception 'Referral already applied to this account';
  end if;

  if exists (select 1 from public.referrals where referee_id = v_user_id) then
    raise exception 'Referral already applied to this account';
  end if;

  update public.profiles
  set
    referred_by = v_referrer_id,
    updated_at = now()
  where id = v_user_id;

  insert into public.referrals (
    referrer_id,
    referee_id,
    referral_code,
    status
  )
  values (
    v_referrer_id,
    v_user_id,
    v_code,
    'pending'
  );
end;
$$;

revoke all on function public.attach_referral_code(text) from public;
grant execute on function public.attach_referral_code(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Extend bootstrap: optional referral code after profile upsert
-- ---------------------------------------------------------------------------
drop function if exists public.bootstrap_user_profile(text, text, text, text, text, text);

create or replace function public.bootstrap_user_profile(
  p_email text,
  p_phone text,
  p_full_name text default null,
  p_first_name text default null,
  p_last_name text default null,
  p_role text default 'customer',
  p_referral_code text default null
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

  -- Optional: attach referrer (no-op when blank). Failure bubbles to client.
  if p_referral_code is not null and length(trim(p_referral_code)) > 0 then
    perform public.attach_referral_code(p_referral_code);
  end if;
end;
$$;

revoke all on function public.bootstrap_user_profile(text, text, text, text, text, text, text) from public;
grant execute on function public.bootstrap_user_profile(text, text, text, text, text, text, text) to authenticated;
