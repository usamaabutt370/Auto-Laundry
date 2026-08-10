-- Allow Press (ironing-only) as a customer order service type.
-- App catalog mirrors Wash & Fold; partner_services category is "Press".

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.order_services'::regclass
      and conname = 'order_services_service_type_check'
  ) then
    alter table public.order_services
      drop constraint order_services_service_type_check;
  end if;
end $$;

alter table public.order_services
  drop constraint if exists order_services_service_type_check;

alter table public.order_services
  add constraint order_services_service_type_check
  check (service_type in ('washAndFold', 'dryCleaning', 'tailoring', 'press'));

alter table public.order_service_items
  drop constraint if exists order_service_items_service_type_check;

alter table public.order_service_items
  add constraint order_service_items_service_type_check
  check (service_type in ('washAndFold', 'dryCleaning', 'tailoring', 'press'));
