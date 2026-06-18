-- Customer-reported order problems for admin review (not visible to partners).

create table if not exists public.order_disputes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.customer_orders (id) on delete cascade,
  customer_id uuid not null references auth.users (id) on delete cascade,
  partner_id uuid not null references public.partner_profiles (id) on delete cascade,
  category text not null default 'other' check (
    category in (
      'damaged_items',
      'missed_pickup',
      'billing',
      'delivery_delay',
      'wrong_items',
      'other'
    )
  ),
  description text not null check (length(trim(description)) > 0),
  image_urls text[] not null default '{}',
  status text not null default 'open' check (
    status in ('open', 'under_review', 'resolved', 'closed')
  ),
  admin_notes text,
  reviewed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists order_disputes_order_idx
  on public.order_disputes (order_id, created_at desc);

create index if not exists order_disputes_customer_idx
  on public.order_disputes (customer_id, created_at desc);

create index if not exists order_disputes_status_idx
  on public.order_disputes (status, created_at desc);

drop trigger if exists order_disputes_set_updated_at on public.order_disputes;
create trigger order_disputes_set_updated_at
before update on public.order_disputes
for each row execute function public.set_updated_at_timestamp();

alter table public.order_disputes enable row level security;

drop policy if exists "Order disputes: customer can read own" on public.order_disputes;
create policy "Order disputes: customer can read own"
  on public.order_disputes for select
  to authenticated
  using (customer_id = auth.uid());

drop policy if exists "Order disputes: customer can insert for own order" on public.order_disputes;
create policy "Order disputes: customer can insert for own order"
  on public.order_disputes for insert
  to authenticated
  with check (
    customer_id = auth.uid()
    and exists (
      select 1
      from public.customer_orders o
      where o.id = order_id
        and o.customer_id = auth.uid()
        and o.status <> 'rejected'
    )
  );

-- Evidence photos uploaded by customers (public URLs stored on dispute rows).
insert into storage.buckets (id, name, public)
values ('dispute-evidence', 'dispute-evidence', true)
on conflict (id) do update set public = true;

drop policy if exists "Dispute evidence: users can upload own prefix" on storage.objects;
create policy "Dispute evidence: users can upload own prefix"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'dispute-evidence'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Dispute evidence: users can update own prefix" on storage.objects;
create policy "Dispute evidence: users can update own prefix"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'dispute-evidence'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'dispute-evidence'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Dispute evidence: users can delete own prefix" on storage.objects;
create policy "Dispute evidence: users can delete own prefix"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'dispute-evidence'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Dispute evidence: public read" on storage.objects;
create policy "Dispute evidence: public read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'dispute-evidence');
