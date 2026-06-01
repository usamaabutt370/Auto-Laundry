-- Partner intake: confirm item counts and final bill after pickup inspection.

alter table public.customer_orders
  add column if not exists confirmed_total numeric(12, 2),
  add column if not exists confirmed_at timestamptz,
  add column if not exists intake_notes text not null default '';

alter table public.order_service_items
  add column if not exists confirmed_quantity integer check (
    confirmed_quantity is null or confirmed_quantity >= 0
  ),
  add column if not exists confirmed_line_total_amount numeric(12, 2);

create or replace function public.partner_confirm_order_bill(
  p_order_id uuid,
  p_items jsonb,
  p_intake_notes text default ''
)
returns table (
  confirmed_total numeric,
  confirmed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner_id uuid;
  v_pickup_fee numeric(12, 2);
  v_lines_total numeric(12, 2) := 0;
  v_item jsonb;
  v_item_id uuid;
  v_qty integer;
  v_unit numeric(12, 2);
  v_line numeric(12, 2);
  v_confirmed_at timestamptz := now();
begin
  v_partner_id := auth.uid();
  if v_partner_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one line item is required';
  end if;

  if not exists (
    select 1
    from public.customer_orders o
    where o.id = p_order_id
      and o.partner_id = v_partner_id
      and o.status in ('accepted', 'in_progress', 'ready')
  ) then
    raise exception 'Order not found or cannot confirm bill for this status';
  end if;

  select coalesce(o.pickup_fee, 0)
  into v_pickup_fee
  from public.customer_orders o
  where o.id = p_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_item_id := (v_item->>'id')::uuid;
    v_qty := greatest(0, coalesce((v_item->>'confirmed_quantity')::integer, 0));

    update public.order_service_items osi
    set
      confirmed_quantity = v_qty,
      confirmed_line_total_amount = case
        when osi.unit_price_amount is not null
          then round(osi.unit_price_amount * v_qty, 2)
        else osi.line_total_amount
      end
    from public.order_services os
    join public.customer_orders o on o.id = os.order_id
    where osi.id = v_item_id
      and osi.order_service_id = os.id
      and os.order_id = p_order_id
      and o.partner_id = v_partner_id;

    if not found then
      raise exception 'Order line not found: %', v_item_id;
    end if;

    select osi.unit_price_amount, osi.confirmed_line_total_amount
    into v_unit, v_line
    from public.order_service_items osi
    where osi.id = v_item_id;

    v_lines_total := v_lines_total + coalesce(v_line, 0);
  end loop;

  update public.customer_orders o
  set
    confirmed_total = round(v_lines_total + v_pickup_fee, 2),
    confirmed_at = v_confirmed_at,
    intake_notes = trim(coalesce(p_intake_notes, ''))
  where o.id = p_order_id
    and o.partner_id = v_partner_id;

  return query
  select o.confirmed_total, o.confirmed_at
  from public.customer_orders o
  where o.id = p_order_id;
end;
$$;

revoke all on function public.partner_confirm_order_bill(uuid, jsonb, text) from public;
grant execute on function public.partner_confirm_order_bill(uuid, jsonb, text) to authenticated;
