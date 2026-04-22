-- Store partner rejection reason details on customer_orders and
-- allow partner RPC status updates to capture those fields.

alter table public.customer_orders
  add column if not exists rejection_reason_option text,
  add column if not exists rejection_reason_details text;

create or replace function public.partner_update_order_status(
  p_order_id uuid,
  p_new_status text,
  p_charge_rate_pct integer default 10,
  p_rejection_reason_option text default null,
  p_rejection_reason_details text default null
)
returns table (
  status text,
  charged integer,
  balance integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner_id uuid;
  v_allowed boolean;
  v_charged integer := 0;
  v_balance integer := 0;
begin
  v_partner_id := auth.uid();
  if v_partner_id is null then
    raise exception 'Not authenticated';
  end if;

  v_allowed := p_new_status in ('accepted', 'rejected', 'in_progress', 'ready', 'completed', 'cancelled');
  if not v_allowed then
    raise exception 'Invalid status transition target';
  end if;

  -- Only charge credits when the order is completed.
  if p_new_status = 'completed' then
    select c.charged, c.balance
    into v_charged, v_balance
    from public.charge_partner_credits_for_order(p_order_id, p_charge_rate_pct) c;
  end if;

  update public.customer_orders o
  set
    status = p_new_status,
    rejection_reason_option = case
      when p_new_status = 'rejected'
        then nullif(trim(coalesce(p_rejection_reason_option, '')), '')
      else null
    end,
    rejection_reason_details = case
      when p_new_status = 'rejected'
        then nullif(trim(coalesce(p_rejection_reason_details, '')), '')
      else null
    end
  where o.id = p_order_id
    and o.partner_id = v_partner_id;

  if not found then
    raise exception 'Order not found or not assigned to partner';
  end if;

  if p_new_status <> 'completed' then
    select a.balance into v_balance
    from public.partner_credit_accounts a
    where a.partner_id = v_partner_id;
  end if;

  return query select p_new_status, v_charged, coalesce(v_balance, 0);
end;
$$;

revoke all on function public.partner_update_order_status(uuid, text, integer, text, text) from public;
grant execute on function public.partner_update_order_status(uuid, text, integer, text, text) to authenticated;
