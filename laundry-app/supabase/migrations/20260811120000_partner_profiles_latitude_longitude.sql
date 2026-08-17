-- Add map coordinates on partner business profiles.
-- App onboarding/business details upserts latitude/longitude from device GPS.
-- Live may already have these columns from an earlier manual change; IF NOT EXISTS keeps this safe.

alter table public.partner_profiles
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;
