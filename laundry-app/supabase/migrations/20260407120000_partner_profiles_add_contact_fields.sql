-- Add partner business contact fields used by onboarding step 1.
alter table public.partner_profiles
  add column if not exists phone_number text not null default '',
  add column if not exists available_time text not null default '',
  add column if not exists address text not null default '';
