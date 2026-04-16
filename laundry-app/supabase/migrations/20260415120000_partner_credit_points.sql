-- Partner credit points system.
-- Grants welcome credits after onboarding and stores all credit movements in a ledger.

create table if not exists public.partner_credit_accounts (
  partner_id uuid primary key references public.partner_profiles (id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  total_earned integer not null default 0 check (total_earned >= 0),
  total_spent integer not null default 0 check (total_spent >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.partner_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partner_profiles (id) on delete cascade,
  event_type text not null check (
    event_type in (
      'welcome_bonus',
      'manual_adjustment',
      'topup',
      'order_charge',
      'order_refund'
    )
  ),
  delta integer not null,
  balance_after integer not null check (balance_after >= 0),
  note text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists partner_credit_ledger_partner_id_idx
  on public.partner_credit_ledger (partner_id, created_at desc);

alter table public.partner_credit_accounts enable row level security;
alter table public.partner_credit_ledger enable row level security;

create policy "Partner credit accounts: users can select own row"
  on public.partner_credit_accounts for select
  using (auth.uid() = partner_id);

create policy "Partner credit ledger: users can select own rows"
  on public.partner_credit_ledger for select
  using (auth.uid() = partner_id);

drop trigger if exists partner_credit_accounts_set_updated_at on public.partner_credit_accounts;
create trigger partner_credit_accounts_set_updated_at
before update on public.partner_credit_accounts
for each row execute function public.set_updated_at_timestamp();

create or replace function public.award_partner_welcome_credits(
  p_credits integer default 2000
)
returns table (awarded integer, balance integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner_id uuid;
  v_existing_balance integer;
begin
  v_partner_id := auth.uid();
  if v_partner_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_credits <= 0 then
    raise exception 'Credits must be greater than zero';
  end if;

  insert into public.partner_credit_accounts (partner_id)
  values (v_partner_id)
  on conflict (partner_id) do nothing;

  if exists (
    select 1
    from public.partner_credit_ledger l
    where l.partner_id = v_partner_id
      and l.event_type = 'welcome_bonus'
  ) then
    select a.balance into v_existing_balance
    from public.partner_credit_accounts a
    where a.partner_id = v_partner_id;

    return query select 0, coalesce(v_existing_balance, 0);
    return;
  end if;

  update public.partner_credit_accounts a
  set
    balance = a.balance + p_credits,
    total_earned = a.total_earned + p_credits
  where a.partner_id = v_partner_id
  returning a.balance into v_existing_balance;

  insert into public.partner_credit_ledger (
    partner_id,
    event_type,
    delta,
    balance_after,
    note
  )
  values (
    v_partner_id,
    'welcome_bonus',
    p_credits,
    coalesce(v_existing_balance, 0),
    'Welcome onboarding credits'
  );

  return query select p_credits, coalesce(v_existing_balance, 0);
end;
$$;

revoke all on function public.award_partner_welcome_credits(integer) from public;
grant execute on function public.award_partner_welcome_credits(integer) to authenticated;
