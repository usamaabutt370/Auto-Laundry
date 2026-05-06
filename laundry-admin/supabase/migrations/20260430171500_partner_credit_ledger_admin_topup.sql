-- Normalize partner_credit_ledger event_type values for admin top-up flow.
-- We only keep these event types:
--   1) welcome_bonus
--   2) order_charge
--   3) admin_topup

-- Map legacy/unknown positive-credit events to admin_topup.
update public.partner_credit_ledger
set event_type = 'admin_topup'
where coalesce(delta, 0) >= 0
  and event_type not in ('welcome_bonus', 'order_charge', 'admin_topup');

-- Map legacy/unknown debit events to order_charge.
update public.partner_credit_ledger
set event_type = 'order_charge'
where coalesce(delta, 0) < 0
  and event_type not in ('welcome_bonus', 'order_charge', 'admin_topup');

alter table public.partner_credit_ledger
drop constraint if exists partner_credit_ledger_event_type_check;

alter table public.partner_credit_ledger
add constraint partner_credit_ledger_event_type_check
check (event_type in ('welcome_bonus', 'order_charge', 'admin_topup'));

create index if not exists partner_credit_ledger_event_type_idx
on public.partner_credit_ledger (event_type);
