-- Customer feedback collected after order completion.

create table if not exists public.customer_order_feedback (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.customer_orders (id) on delete cascade,
  customer_id uuid not null references auth.users (id) on delete cascade,
  partner_id uuid not null references public.partner_profiles (id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  feedback_type text not null check (feedback_type in ('feedback', 'complaint', 'suggestion')),
  message text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, customer_id)
);

create index if not exists customer_order_feedback_customer_idx
  on public.customer_order_feedback (customer_id, created_at desc);

create index if not exists customer_order_feedback_partner_idx
  on public.customer_order_feedback (partner_id, created_at desc);

drop trigger if exists customer_order_feedback_set_updated_at on public.customer_order_feedback;
create trigger customer_order_feedback_set_updated_at
before update on public.customer_order_feedback
for each row execute function public.set_updated_at_timestamp();

alter table public.customer_order_feedback enable row level security;

drop policy if exists "Customer feedback: customer can read own" on public.customer_order_feedback;
create policy "Customer feedback: customer can read own"
  on public.customer_order_feedback for select
  to authenticated
  using (customer_id = auth.uid());

drop policy if exists "Customer feedback: customer can insert own" on public.customer_order_feedback;
create policy "Customer feedback: customer can insert own"
  on public.customer_order_feedback for insert
  to authenticated
  with check (customer_id = auth.uid());

drop policy if exists "Customer feedback: partner can read assigned order feedback" on public.customer_order_feedback;
create policy "Customer feedback: partner can read assigned order feedback"
  on public.customer_order_feedback for select
  to authenticated
  using (partner_id = auth.uid());

