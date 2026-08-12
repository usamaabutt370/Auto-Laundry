-- Copied from laundry-admin so app + admin share one schema source.
-- Apply to DEV first; do not push to live until production is ready.

create table if not exists public.order_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.customer_orders(id) on delete cascade,
  payment_intent_id text null,
  transaction_id text null,
  method_type text null,
  method_label text null,
  currency text not null default 'USD',
  gross_amount numeric(12,2) not null default 0,
  commission_rate numeric(5,4) not null default 0.10,
  commission_amount numeric(12,2) not null default 0,
  partner_net_amount numeric(12,2) not null default 0,
  payment_timing text not null default 'paid_at_order',
  payment_status text not null default 'pending',
  escrow_status text not null default 'awaiting_payment',
  payout_status text not null default 'not_ready',
  charged_at timestamptz null,
  order_completed_at timestamptz null,
  payout_processed_at timestamptz null,
  refunded_at timestamptz null,
  dispute_id text null,
  notes jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_payments_payment_timing_check check (payment_timing in ('paid_at_order', 'paid_at_completion')),
  constraint order_payments_payment_status_check check (payment_status in ('pending', 'succeeded', 'failed', 'refunded')),
  constraint order_payments_escrow_status_check check (escrow_status in ('awaiting_payment', 'in_escrow', 'ready_for_payout', 'released', 'refunded', 'failed')),
  constraint order_payments_payout_status_check check (payout_status in ('not_ready', 'ready', 'sent', 'on_hold', 'failed'))
);

create unique index if not exists order_payments_order_id_key on public.order_payments(order_id);
create index if not exists order_payments_payment_status_idx on public.order_payments(payment_status);
create index if not exists order_payments_escrow_status_idx on public.order_payments(escrow_status);
create index if not exists order_payments_payout_status_idx on public.order_payments(payout_status);
