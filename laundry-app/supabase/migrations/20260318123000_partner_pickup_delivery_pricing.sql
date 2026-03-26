-- Add pickup/delivery add-on settings to partner_profiles so onboarding/settings values persist.
alter table if exists public.partner_profiles
  add column if not exists pickup_delivery_enabled boolean not null default false,
  add column if not exists pickup_delivery_amount text not null default '';
