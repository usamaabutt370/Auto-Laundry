-- Customer order schema.
-- Supports orders with any combination of services:
-- - washAndFold
-- - dryCleaning
-- - tailoring
--
-- Design:
-- 1) customer_orders: order header (customer, launderer, scheduling, totals, status)
-- 2) order_services: one row per selected service in an order
-- 3) order_service_items: itemized rows (mainly for dry cleaning / tailoring lines)

create table if not exists public.customer_orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users (id) on delete restrict,
  partner_id uuid not null references public.partner_profiles (id) on delete restrict,
  status text not null default 'draft' check (
    status in (
      'draft',
      'submitted',
      'accepted',
      'in_progress',
      'ready',
      'completed',
      'cancelled'
    )
  ),
  currency_prefix text not null default '',
  estimated_partial_total numeric(12, 2) not null default 0,
  estimated_total numeric(12, 2),
  pickup_fee numeric(12, 2),
  pickup_date_iso text,
  pickup_day_label text,
  pickup_time_slot_label text,
  pickup_instructions text not null default '',
  delivery_date_iso text,
  delivery_day_label text,
  delivery_time_slot_label text,
  delivery_instructions text not null default '',
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_orders_customer_id_idx
  on public.customer_orders (customer_id);

create index if not exists customer_orders_partner_id_idx
  on public.customer_orders (partner_id);

create index if not exists customer_orders_status_idx
  on public.customer_orders (status);

create table if not exists public.order_services (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.customer_orders (id) on delete cascade,
  service_type text not null check (
    service_type in ('washAndFold', 'dryCleaning', 'tailoring')
  ),
  -- wash & fold specific fields; nullable for other service types.
  wash_fold_pricing_mode text check (
    wash_fold_pricing_mode in ('per_bag', 'per_item')
  ),
  wash_fold_bag_count integer check (wash_fold_bag_count is null or wash_fold_bag_count >= 0),
  wash_fold_item_count integer check (
    wash_fold_item_count is null or wash_fold_item_count >= 0
  ),
  instructions text not null default '',
  estimated_amount numeric(12, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, service_type)
);

create index if not exists order_services_order_id_idx
  on public.order_services (order_id);

create index if not exists order_services_service_type_idx
  on public.order_services (service_type);

create table if not exists public.order_service_items (
  id uuid primary key default gen_random_uuid(),
  order_service_id uuid not null references public.order_services (id) on delete cascade,
  item_key text not null,
  item_name text not null,
  quantity integer not null check (quantity >= 0),
  unit_price_display text,
  unit_price_amount numeric(12, 2),
  line_total_amount numeric(12, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_service_id, item_key)
);

create index if not exists order_service_items_order_service_id_idx
  on public.order_service_items (order_service_id);

-- Keep updated_at fresh across writes.
create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists customer_orders_set_updated_at on public.customer_orders;
create trigger customer_orders_set_updated_at
before update on public.customer_orders
for each row execute function public.set_updated_at_timestamp();

drop trigger if exists order_services_set_updated_at on public.order_services;
create trigger order_services_set_updated_at
before update on public.order_services
for each row execute function public.set_updated_at_timestamp();

drop trigger if exists order_service_items_set_updated_at on public.order_service_items;
create trigger order_service_items_set_updated_at
before update on public.order_service_items
for each row execute function public.set_updated_at_timestamp();

alter table public.customer_orders enable row level security;
alter table public.order_services enable row level security;
alter table public.order_service_items enable row level security;

-- customer_orders RLS
create policy "Customer orders: customer can select own orders"
  on public.customer_orders for select
  using (auth.uid() = customer_id);

create policy "Customer orders: customer can insert own orders"
  on public.customer_orders for insert
  with check (auth.uid() = customer_id);

create policy "Customer orders: customer can update own draft-like orders"
  on public.customer_orders for update
  using (auth.uid() = customer_id)
  with check (auth.uid() = customer_id);

create policy "Customer orders: partner can read assigned orders"
  on public.customer_orders for select
  to authenticated
  using (auth.uid() = partner_id);

create policy "Customer orders: partner can update assigned orders"
  on public.customer_orders for update
  to authenticated
  using (auth.uid() = partner_id)
  with check (auth.uid() = partner_id);

-- order_services RLS
create policy "Order services: customer can read own order services"
  on public.order_services for select
  using (
    exists (
      select 1 from public.customer_orders o
      where o.id = order_services.order_id
      and o.customer_id = auth.uid()
    )
  );

create policy "Order services: customer can write own order services"
  on public.order_services for all
  using (
    exists (
      select 1 from public.customer_orders o
      where o.id = order_services.order_id
      and o.customer_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.customer_orders o
      where o.id = order_services.order_id
      and o.customer_id = auth.uid()
    )
  );

create policy "Order services: partner can read assigned order services"
  on public.order_services for select
  to authenticated
  using (
    exists (
      select 1 from public.customer_orders o
      where o.id = order_services.order_id
      and o.partner_id = auth.uid()
    )
  );

-- order_service_items RLS
create policy "Order service items: customer can read own items"
  on public.order_service_items for select
  using (
    exists (
      select 1
      from public.order_services os
      join public.customer_orders o on o.id = os.order_id
      where os.id = order_service_items.order_service_id
      and o.customer_id = auth.uid()
    )
  );

create policy "Order service items: customer can write own items"
  on public.order_service_items for all
  using (
    exists (
      select 1
      from public.order_services os
      join public.customer_orders o on o.id = os.order_id
      where os.id = order_service_items.order_service_id
      and o.customer_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.order_services os
      join public.customer_orders o on o.id = os.order_id
      where os.id = order_service_items.order_service_id
      and o.customer_id = auth.uid()
    )
  );

create policy "Order service items: partner can read assigned items"
  on public.order_service_items for select
  to authenticated
  using (
    exists (
      select 1
      from public.order_services os
      join public.customer_orders o on o.id = os.order_id
      where os.id = order_service_items.order_service_id
      and o.partner_id = auth.uid()
    )
  );
