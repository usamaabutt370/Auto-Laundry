-- Add optional profile fields for address, date of birth, and profile image URL.
alter table public.profiles
  add column if not exists address text,
  add column if not exists date_of_birth text,
  add column if not exists image_url text;
