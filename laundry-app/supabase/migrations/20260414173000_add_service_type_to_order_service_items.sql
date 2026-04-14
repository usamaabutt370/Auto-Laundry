-- Add explicit service_type on itemized rows for easier reporting/debugging.

alter table public.order_service_items
  add column if not exists service_type text;

-- Backfill existing rows from parent order_services.
update public.order_service_items osi
set service_type = os.service_type
from public.order_services os
where os.id = osi.order_service_id
  and osi.service_type is null;

alter table public.order_service_items
  alter column service_type set not null;

alter table public.order_service_items
  add constraint order_service_items_service_type_check
  check (service_type in ('washAndFold', 'dryCleaning', 'tailoring'));

create index if not exists order_service_items_service_type_idx
  on public.order_service_items (service_type);
