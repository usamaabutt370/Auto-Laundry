-- Let customers remove finished orders from their own list without deleting the
-- row: a hard delete cascades into payments, feedback (partner ratings),
-- disputes and chat, which belong to the partner's history too.

alter table public.customer_orders
  add column if not exists customer_hidden_at timestamptz;

create index if not exists customer_orders_customer_visible_idx
  on public.customer_orders (customer_id, updated_at desc)
  where customer_hidden_at is null;

create or replace function public.customer_hide_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
begin
  v_customer_id := auth.uid();
  if v_customer_id is null then
    raise exception 'Not authenticated';
  end if;

  update public.customer_orders o
  set customer_hidden_at = now()
  where o.id = p_order_id
    and o.customer_id = v_customer_id
    and o.status in ('completed', 'rejected', 'cancelled')
    and o.customer_hidden_at is null;

  if not found then
    raise exception 'Only completed, rejected or cancelled orders can be removed';
  end if;
end;
$$;

revoke all on function public.customer_hide_order(uuid) from public;
grant execute on function public.customer_hide_order(uuid) to authenticated;
