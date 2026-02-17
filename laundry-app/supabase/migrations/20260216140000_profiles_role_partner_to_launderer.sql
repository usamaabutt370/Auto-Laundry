-- Use role value 'launderer' instead of 'partner' in profiles.role.
update public.profiles
set role = 'launderer'
where role = 'partner';
