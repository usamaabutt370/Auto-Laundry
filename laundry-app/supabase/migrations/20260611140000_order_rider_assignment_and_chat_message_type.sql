-- Assign partner riders to accepted orders and support structured chat messages.

alter table public.customer_orders
  add column if not exists assigned_rider_id uuid references public.partner_riders (id) on delete set null,
  add column if not exists assigned_rider_name text,
  add column if not exists assigned_rider_phone text,
  add column if not exists assigned_rider_photo_url text;

alter table public.chat_messages
  add column if not exists message_type text not null default 'text',
  add column if not exists metadata jsonb;

alter table public.chat_messages
  drop constraint if exists chat_messages_text_or_image_check;

alter table public.chat_messages
  add constraint chat_messages_content_check check (
    (message_type = 'rider_assignment' and metadata is not null)
    or length(trim(coalesce(body, ''))) > 0
    or (image_url is not null and length(trim(image_url)) > 0)
  );

create or replace function public.partner_update_order_status(
  p_order_id uuid,
  p_new_status text,
  p_charge_rate_pct integer default 10,
  p_rejection_reason_option text default null,
  p_rejection_reason_details text default null,
  p_assigned_rider_id uuid default null
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
  v_rider_name text;
  v_rider_phone text;
  v_rider_photo text;
begin
  v_partner_id := auth.uid();
  if v_partner_id is null then
    raise exception 'Not authenticated';
  end if;

  v_allowed := p_new_status in ('accepted', 'rejected', 'in_progress', 'ready', 'completed', 'cancelled');
  if not v_allowed then
    raise exception 'Invalid status transition target';
  end if;

  if p_new_status = 'accepted' and p_assigned_rider_id is not null then
    select r.name, r.phone, r.photo_url
    into v_rider_name, v_rider_phone, v_rider_photo
    from public.partner_riders r
    where r.id = p_assigned_rider_id
      and r.partner_id = v_partner_id;

    if not found then
      raise exception 'Rider not found or does not belong to partner';
    end if;
  end if;

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
    end,
    assigned_rider_id = case
      when p_new_status = 'accepted' and p_assigned_rider_id is not null
        then p_assigned_rider_id
      else o.assigned_rider_id
    end,
    assigned_rider_name = case
      when p_new_status = 'accepted' and p_assigned_rider_id is not null
        then v_rider_name
      else o.assigned_rider_name
    end,
    assigned_rider_phone = case
      when p_new_status = 'accepted' and p_assigned_rider_id is not null
        then v_rider_phone
      else o.assigned_rider_phone
    end,
    assigned_rider_photo_url = case
      when p_new_status = 'accepted' and p_assigned_rider_id is not null
        then v_rider_photo
      else o.assigned_rider_photo_url
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

revoke all on function public.partner_update_order_status(uuid, text, integer, text, text, uuid) from public;
grant execute on function public.partner_update_order_status(uuid, text, integer, text, text, uuid) to authenticated;
