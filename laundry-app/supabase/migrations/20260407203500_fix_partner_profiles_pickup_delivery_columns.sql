-- Ensure pickup/delivery fields exist even when older migration history was repaired.
alter table if exists public.partner_profiles
  add column if not exists pickup_delivery_enabled boolean not null default false,
  add column if not exists pickup_delivery_amount text not null default '';
