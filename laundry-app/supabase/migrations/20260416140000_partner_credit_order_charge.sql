-- Deduct partner credits from wallet when partner accepts an order.
-- Includes idempotency so the same order is not charged twice.

create unique index if not exists partner_credit_order_charge_unique_idx
  on public.partner_credit_ledger (partner_id, event_type, ((metadata ->> 'order_id')))
  where event_type = 'order_charge';

create or replace function public.charge_partner_credits_for_order(
  p_order_id uuid,
  p_rate_pct integer default 10
)
returns table (
  charged integer,
  balance integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner_id uuid;
  v_order_amount numeric(12, 2);
  v_credits_to_charge integer;
  v_current_balance integer;
begin
  v_partner_id := auth.uid();
  if v_partner_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_rate_pct <= 0 then
    raise exception 'Rate percent must be greater than zero';
  end if;

  select coalesce(o.estimated_total, o.estimated_partial_total, 0)
  into v_order_amount
  from public.customer_orders o
  where o.id = p_order_id
    and o.partner_id = v_partner_id
  for update;

  if not found then
    raise exception 'Order not found or not assigned to partner';
  end if;

  if exists (
    select 1
    from public.partner_credit_ledger l
    where l.partner_id = v_partner_id
      and l.event_type = 'order_charge'
      and l.metadata ->> 'order_id' = p_order_id::text
  ) then
    select a.balance into v_current_balance
    from public.partner_credit_accounts a
    where a.partner_id = v_partner_id;

    return query select 0, coalesce(v_current_balance, 0);
    return;
  end if;

  if v_order_amount <= 0 then
    v_credits_to_charge := 0;
  else
    v_credits_to_charge := greatest(
      1,
      ceil((v_order_amount * p_rate_pct) / 100.0)::integer
    );
  end if;

  insert into public.partner_credit_accounts (partner_id)
  values (v_partner_id)
  on conflict (partner_id) do nothing;

  select a.balance into v_current_balance
  from public.partner_credit_accounts a
  where a.partner_id = v_partner_id
  for update;

  if v_credits_to_charge > coalesce(v_current_balance, 0) then
    raise exception 'Insufficient credits';
  end if;

  if v_credits_to_charge > 0 then
    update public.partner_credit_accounts a
    set
      balance = a.balance - v_credits_to_charge,
      total_spent = a.total_spent + v_credits_to_charge
    where a.partner_id = v_partner_id
    returning a.balance into v_current_balance;

    insert into public.partner_credit_ledger (
      partner_id,
      event_type,
      delta,
      balance_after,
      note,
      metadata
    )
    values (
      v_partner_id,
      'order_charge',
      -v_credits_to_charge,
      v_current_balance,
      'Order acceptance charge',
      jsonb_build_object(
        'order_id', p_order_id::text,
        'rate_pct', p_rate_pct,
        'order_amount', v_order_amount
      )
    );
  end if;

  return query select v_credits_to_charge, coalesce(v_current_balance, 0);
end;
$$;

create or replace function public.partner_update_order_status(
  p_order_id uuid,
  p_new_status text,
  p_charge_rate_pct integer default 10
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

  if p_new_status = 'accepted' then
    select c.charged, c.balance
    into v_charged, v_balance
    from public.charge_partner_credits_for_order(p_order_id, p_charge_rate_pct) c;
  end if;

  update public.customer_orders o
  set status = p_new_status
  where o.id = p_order_id
    and o.partner_id = v_partner_id;

  if not found then
    raise exception 'Order not found or not assigned to partner';
  end if;

  if p_new_status <> 'accepted' then
    select a.balance into v_balance
    from public.partner_credit_accounts a
    where a.partner_id = v_partner_id;
  end if;

  return query select p_new_status, v_charged, coalesce(v_balance, 0);
end;
$$;

revoke all on function public.charge_partner_credits_for_order(uuid, integer) from public;
grant execute on function public.charge_partner_credits_for_order(uuid, integer) to authenticated;

revoke all on function public.partner_update_order_status(uuid, text, integer) from public;
grant execute on function public.partner_update_order_status(uuid, text, integer) to authenticated;
