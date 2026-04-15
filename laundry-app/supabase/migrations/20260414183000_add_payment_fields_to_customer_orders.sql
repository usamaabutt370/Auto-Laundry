-- Add payment lifecycle fields to customer orders.

alter table public.customer_orders
  add column if not exists payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  add column if not exists payment_method_type text,
  add column if not exists payment_intent_id text,
  add column if not exists paid_at timestamptz;

create index if not exists customer_orders_payment_status_idx
  on public.customer_orders (payment_status);
