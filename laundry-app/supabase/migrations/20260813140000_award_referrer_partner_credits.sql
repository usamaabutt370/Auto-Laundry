-- Partner referral payout + safety rules.
--
-- Rules:
--   1. Cannot use your own referral code
--   2. One code per friend (cannot apply a second code)
--   3. Same code can be used by many friends
--   4. 500 only after the friend is KYC-approved — never on signup
--   5. 500 only once per friend
--   6. One pending friend does not block referring others
--
-- Called from admin KYC approve:
--   select * from public.award_referrer_credits_on_partner_approved('<referee-uuid>');

-- ---------------------------------------------------------------------------
-- Allow referral_bonus on the partner credit ledger
-- ---------------------------------------------------------------------------
alter table public.partner_credit_ledger
  drop constraint if exists partner_credit_ledger_event_type_check;

alter table public.partner_credit_ledger
  add constraint partner_credit_ledger_event_type_check
  check (event_type in (
    'welcome_bonus',
    'order_charge',
    'order_refund',
    'admin_topup',
    'topup',
    'manual_adjustment',
    'referral_bonus'
  ));

-- One ledger row per referral (blocks double pay if the RPC is retried)
create unique index if not exists partner_credit_ledger_referral_bonus_unique_idx
  on public.partner_credit_ledger (((metadata ->> 'referral_id')))
  where event_type = 'referral_bonus'
    and (metadata ->> 'referral_id') is not null;

-- ---------------------------------------------------------------------------
-- Attach: same referrer is a no-op; a different code is rejected
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
  v_existing_referrer_id uuid;
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
    if v_existing_referred_by = v_referrer_id then
      return;
    end if;
    raise exception 'Referral already applied to this account';
  end if;

  select r.referrer_id
  into v_existing_referrer_id
  from public.referrals r
  where r.referee_id = v_user_id
  limit 1;

  if v_existing_referrer_id is not null then
    if v_existing_referrer_id = v_referrer_id then
      return;
    end if;
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
-- Award 500 partner credits to the referrer when the referee is approved
-- ---------------------------------------------------------------------------
create or replace function public.award_referrer_credits_on_partner_approved(
  p_referee_id uuid,
  p_credits integer default 500
)
returns table (awarded integer, referrer_id uuid, balance integer)
language plpgsql
security definer
set search_path to public
as $$
declare
  v_referral public.referrals%rowtype;
  v_balance integer;
begin
  if p_referee_id is null then
    raise exception 'Referee id is required';
  end if;

  if p_credits is null or p_credits <= 0 then
    raise exception 'Credits must be greater than zero';
  end if;

  select *
  into v_referral
  from public.referrals r
  where r.referee_id = p_referee_id
  for update;

  if not found then
    return query select 0, null::uuid, 0;
    return;
  end if;

  if v_referral.status = 'rewarded' then
    select a.balance
    into v_balance
    from public.partner_credit_accounts a
    where a.partner_id = v_referral.referrer_id;

    return query select 0, v_referral.referrer_id, coalesce(v_balance, 0);
    return;
  end if;

  if v_referral.status not in ('pending', 'qualified') then
    return query select 0, v_referral.referrer_id, 0;
    return;
  end if;

  if v_referral.referrer_id = p_referee_id then
    return query select 0, v_referral.referrer_id, 0;
    return;
  end if;

  -- 500 only after KYC approve — not on signup or onboarding submit
  if not exists (
    select 1
    from public.partner_onboarding_requests por
    where por.user_id = p_referee_id
      and por.status = 'approved'
  ) then
    return query select 0, v_referral.referrer_id, 0;
    return;
  end if;

  -- Partner credits require a partner_profiles row (referrer must already be a launderer)
  if not exists (
    select 1 from public.partner_profiles p where p.id = v_referral.referrer_id
  ) then
    return query select 0, v_referral.referrer_id, 0;
    return;
  end if;

  insert into public.partner_credit_accounts (partner_id)
  values (v_referral.referrer_id)
  on conflict (partner_id) do nothing;

  update public.partner_credit_accounts a
  set
    balance = a.balance + p_credits,
    total_earned = a.total_earned + p_credits,
    updated_at = now()
  where a.partner_id = v_referral.referrer_id
  returning a.balance into v_balance;

  insert into public.partner_credit_ledger (
    partner_id,
    event_type,
    delta,
    balance_after,
    note,
    metadata
  )
  values (
    v_referral.referrer_id,
    'referral_bonus',
    p_credits,
    coalesce(v_balance, 0),
    'Referral bonus: friend became a Laundry Captain',
    jsonb_build_object(
      'referral_id', v_referral.id,
      'referee_id', p_referee_id,
      'source', 'kyc_approval'
    )
  );

  update public.referrals r
  set
    status = 'rewarded',
    qualified_at = coalesce(r.qualified_at, now()),
    updated_at = now()
  where r.id = v_referral.id;

  return query select p_credits, v_referral.referrer_id, coalesce(v_balance, 0);
end;
$$;

revoke all on function public.award_referrer_credits_on_partner_approved(uuid, integer) from public;
revoke all on function public.award_referrer_credits_on_partner_approved(uuid, integer) from authenticated;
grant execute on function public.award_referrer_credits_on_partner_approved(uuid, integer) to service_role;
