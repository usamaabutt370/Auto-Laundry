-- Extra fields for the Add / Edit Address form (location, parts, contact).

alter table public.customer_addresses
  add column if not exists house_no text not null default '',
  add column if not exists street text not null default '',
  add column if not exists city text not null default '',
  add column if not exists landmark text not null default '',
  add column if not exists selected_location text not null default '',
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists contact_name text not null default '',
  add column if not exists contact_phone text not null default '';
