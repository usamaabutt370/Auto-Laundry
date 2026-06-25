-- Partner credit balances, ledger, and top-up requests for admin credits management.

create table if not exists public.partner_credit_accounts (
  partner_id uuid primary key references auth.users (id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.partner_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null,
  delta integer not null,
  balance_after integer not null,
  note text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.partner_credit_ledger
drop constraint if exists partner_credit_ledger_event_type_check;

alter table public.partner_credit_ledger
add constraint partner_credit_ledger_event_type_check
check (event_type in ('welcome_bonus', 'order_charge', 'admin_topup'));

create index if not exists partner_credit_ledger_partner_id_idx
on public.partner_credit_ledger (partner_id);

create index if not exists partner_credit_ledger_created_at_idx
on public.partner_credit_ledger (created_at desc);

create table if not exists public.partner_credit_requests (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references auth.users (id) on delete cascade,
  amount_requested integer not null check (amount_requested > 0),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  whatsapp_note text,
  created_at timestamptz not null default now()
);

create index if not exists partner_credit_requests_partner_id_idx
on public.partner_credit_requests (partner_id);
