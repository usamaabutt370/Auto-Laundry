-- Partner KYC / onboarding approval workflow.
-- One row per partner user to track submission and admin review status.

create table if not exists public.partner_onboarding_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  status text not null default 'draft',
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  rejection_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_onboarding_requests_status_check
    check (status in ('draft', 'submitted', 'approved', 'rejected'))
);

create index if not exists partner_onboarding_requests_status_idx
  on public.partner_onboarding_requests (status);

alter table public.partner_onboarding_requests enable row level security;

create policy "Partner onboarding requests: users can select own row"
  on public.partner_onboarding_requests
  for select
  using (auth.uid() = user_id);

create policy "Partner onboarding requests: users can insert own row"
  on public.partner_onboarding_requests
  for insert
  with check (
    auth.uid() = user_id
    and status in ('draft', 'submitted')
  );

create policy "Partner onboarding requests: users can update own draft/rejected row"
  on public.partner_onboarding_requests
  for update
  using (
    auth.uid() = user_id
    and status in ('draft', 'rejected', 'submitted')
  )
  with check (
    auth.uid() = user_id
    and status in ('draft', 'submitted')
  );
