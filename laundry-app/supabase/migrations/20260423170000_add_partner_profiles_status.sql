-- Add current approval status snapshot to partner_profiles.
-- This is the primary read field for admin/app status display.
-- Copied from laundry-admin so app + admin share one schema source.
-- Apply to DEV first; do not push to live until production is ready.

alter table public.partner_profiles
add column if not exists status text;

alter table public.partner_profiles
drop constraint if exists partner_profiles_status_check;

alter table public.partner_profiles
add constraint partner_profiles_status_check
check (status in ('pending', 'approved', 'rejected'));

update public.partner_profiles
set status = 'pending'
where status is null;

alter table public.partner_profiles
alter column status set default 'pending';

create index if not exists partner_profiles_status_idx
on public.partner_profiles (status);
