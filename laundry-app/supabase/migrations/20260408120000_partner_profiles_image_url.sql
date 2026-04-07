-- Partner/business profile image (separate from profiles.image_url for customer avatar).
alter table if exists public.partner_profiles
  add column if not exists image_url text;
