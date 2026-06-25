-- Let customers reassign a rejected order to another verified partner.

create or replace function public.customer_reassign_rejected_order(
  p_order_id uuid,
  p_new_partner_id uuid
)
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

  if p_new_partner_id is null then
    raise exception 'A launderer must be selected';
  end if;

  if not exists (
    select 1
    from public.partner_profiles pp
    where pp.id = p_new_partner_id
  ) then
    raise exception 'Selected launderer is not available';
  end if;

  update public.customer_orders o
  set
    partner_id = p_new_partner_id,
    status = 'submitted',
    rejection_reason_option = null,
    rejection_reason_details = null,
    updated_at = now(),
    submitted_at = coalesce(o.submitted_at, now())
  where o.id = p_order_id
    and o.customer_id = v_customer_id
    and o.status = 'rejected';

  if not found then
    raise exception 'Only rejected orders can be reassigned';
  end if;
end;
$$;

revoke all on function public.customer_reassign_rejected_order(uuid, uuid) from public;
grant execute on function public.customer_reassign_rejected_order(uuid, uuid) to authenticated;
