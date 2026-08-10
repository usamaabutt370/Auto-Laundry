-- Step 1: Referral program foundation (schema + RLS only).
-- Rewards / RPCs / code generation / app UI land in later steps.
--
-- v1 product defaults (documented here; enforced in later RPC steps):
--   - 30 points awarded per qualified referral
--   - 1 point = Rs 1 discount
--   - Friend (referee) receives no signup bonus

-- ---------------------------------------------------------------------------
-- profiles: unique referral code + optional referrer link
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists referral_code text;

alter table public.profiles
  add column if not exists referred_by uuid references public.profiles (id) on delete set null;

-- Enforced unique when present; multiple NULLs allowed until codes are generated (Step 2).
create unique index if not exists profiles_referral_code_key
  on public.profiles (referral_code)
  where referral_code is not null;

-- Block self-referral at the profile level when referred_by is set.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_referred_by_not_self'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_referred_by_not_self
      check (referred_by is null or referred_by <> id);
  end if;
end $$;

create index if not exists profiles_referred_by_idx
  on public.profiles (referred_by)
  where referred_by is not null;

-- ---------------------------------------------------------------------------
-- referrals: one row per invited user
-- ---------------------------------------------------------------------------
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles (id) on delete cascade,
  referee_id uuid not null references public.profiles (id) on delete cascade,
  referral_code text not null,
  status text not null default 'pending'
    check (status in ('pending', 'qualified', 'rewarded', 'rejected')),
  qualified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint referrals_referee_unique unique (referee_id),
  constraint referrals_not_self check (referrer_id <> referee_id)
);

create index if not exists referrals_referrer_status_idx
  on public.referrals (referrer_id, status, created_at desc);

create index if not exists referrals_code_idx
  on public.referrals (referral_code);

drop trigger if exists referrals_set_updated_at on public.referrals;
create trigger referrals_set_updated_at
before update on public.referrals
for each row execute function public.set_updated_at_timestamp();

alter table public.referrals enable row level security;

drop policy if exists "Referrals: parties can select own rows" on public.referrals;
create policy "Referrals: parties can select own rows"
  on public.referrals
  for select
  to authenticated
  using (referrer_id = auth.uid() or referee_id = auth.uid());

-- No direct insert/update/delete for clients — Step 2+ security definer RPCs only.

-- ---------------------------------------------------------------------------
-- points_ledger: append-only earn / redeem history
-- balance for a user = sum(amount); positive = earn, negative = redeem
-- ---------------------------------------------------------------------------
create table if not exists public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount integer not null check (amount <> 0),
  reason text not null,
  related_referral_id uuid references public.referrals (id) on delete set null,
  related_redemption_id uuid,
  created_at timestamptz not null default now(),
  constraint points_ledger_reason_check check (
    reason in (
      'referral_reward',
      'redemption',
      'manual_adjustment',
      'reversal'
    )
  )
);

create index if not exists points_ledger_user_created_idx
  on public.points_ledger (user_id, created_at desc);

create index if not exists points_ledger_referral_idx
  on public.points_ledger (related_referral_id)
  where related_referral_id is not null;

alter table public.points_ledger enable row level security;

drop policy if exists "Points ledger: users can select own rows" on public.points_ledger;
create policy "Points ledger: users can select own rows"
  on public.points_ledger
  for select
  to authenticated
  using (user_id = auth.uid());

-- No direct insert/update/delete for clients — Step 2+ security definer RPCs only.

-- ---------------------------------------------------------------------------
-- redemptions: point → discount conversions
-- ---------------------------------------------------------------------------
create table if not exists public.redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  points_spent integer not null check (points_spent > 0),
  discount_value numeric(12, 2) not null check (discount_value > 0),
  discount_code text,
  status text not null default 'pending'
    check (status in ('pending', 'applied', 'cancelled', 'expired')),
  order_id uuid references public.customer_orders (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists redemptions_discount_code_key
  on public.redemptions (discount_code)
  where discount_code is not null;

create index if not exists redemptions_user_created_idx
  on public.redemptions (user_id, created_at desc);

create index if not exists redemptions_status_idx
  on public.redemptions (user_id, status);

drop trigger if exists redemptions_set_updated_at on public.redemptions;
create trigger redemptions_set_updated_at
before update on public.redemptions
for each row execute function public.set_updated_at_timestamp();

alter table public.redemptions enable row level security;

drop policy if exists "Redemptions: users can select own rows" on public.redemptions;
create policy "Redemptions: users can select own rows"
  on public.redemptions
  for select
  to authenticated
  using (user_id = auth.uid());

-- No direct insert/update/delete for clients — Step 2+ security definer RPCs only.

-- Link ledger → redemption after both tables exist (avoids create-order cycle).
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'points_ledger_related_redemption_fkey'
      and conrelid = 'public.points_ledger'::regclass
  ) then
    alter table public.points_ledger
      add constraint points_ledger_related_redemption_fkey
      foreign key (related_redemption_id)
      references public.redemptions (id)
      on delete set null;
  end if;
end $$;

create index if not exists points_ledger_redemption_idx
  on public.points_ledger (related_redemption_id)
  where related_redemption_id is not null;

-- ---------------------------------------------------------------------------
-- Helper view: current points balance (read-only convenience for later UI)
-- ---------------------------------------------------------------------------
create or replace view public.referral_points_balances
with (security_invoker = true)
as
select
  p.id as user_id,
  coalesce(sum(l.amount), 0)::integer as balance
from public.profiles p
left join public.points_ledger l on l.user_id = p.id
group by p.id;

grant select on public.referral_points_balances to authenticated;
