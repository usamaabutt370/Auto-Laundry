-- Partner dashboard stats: one row per partner (user_id).
-- Populate via your orders/transactions pipeline or a cron/edge function.
-- The app reads this for the Dashboard screen (Week/Month/Year filter can use period later).

create table if not exists public.partner_dashboard_stats (
  user_id uuid primary key references auth.users (id) on delete cascade,
  number_of_users int not null default 0,
  drop_off_total int not null default 0,
  drop_off_wash_and_fold int not null default 0,
  drop_off_dry_cleaning int not null default 0,
  drop_off_tailoring int not null default 0,
  delivery_total int not null default 0,
  delivery_wash_and_fold int not null default 0,
  delivery_dry_cleaning int not null default 0,
  delivery_tailoring int not null default 0,
  total_income numeric not null default 0,
  drop_off_income numeric not null default 0,
  delivery_income numeric not null default 0,
  balance numeric not null default 0,
  chart_values int[] not null default array[0,0,0,0,0,0,0],
  updated_at timestamptz not null default now()
);

comment on table public.partner_dashboard_stats is 'Aggregated stats for partner dashboard (orders, income, balance, 7-day chart).';

alter table public.partner_dashboard_stats enable row level security;

create policy "Partner dashboard stats: users can select own row"
  on public.partner_dashboard_stats for select
  using (auth.uid() = user_id);

-- Optional: allow insert/update so an edge function or backend can write. Restrict to own user_id.
create policy "Partner dashboard stats: users can insert own row"
  on public.partner_dashboard_stats for insert
  with check (auth.uid() = user_id);

create policy "Partner dashboard stats: users can update own row"
  on public.partner_dashboard_stats for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
