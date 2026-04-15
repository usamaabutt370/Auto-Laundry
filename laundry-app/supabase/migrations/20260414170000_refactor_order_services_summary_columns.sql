-- Refactor order_services to a generic per-service summary shape.
-- Keeps itemized breakdown in order_service_items.

alter table public.order_services
  add column if not exists pricing_mode text check (
    pricing_mode in ('per_item')
  ),
  add column if not exists total_item_count integer not null default 0 check (total_item_count >= 0);

update public.order_services
set pricing_mode = 'per_item'
where pricing_mode is null;

alter table public.order_services
  alter column pricing_mode set default 'per_item',
  alter column pricing_mode set not null;

-- Legacy wash-only fields are replaced by generic summary fields.
alter table public.order_services
  drop column if exists wash_fold_pricing_mode,
  drop column if exists wash_fold_bag_count,
  drop column if exists wash_fold_item_count;
