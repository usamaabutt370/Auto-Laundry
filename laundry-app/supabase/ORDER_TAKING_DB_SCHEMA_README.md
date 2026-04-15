# Order Taking DB Schema

This document explains the order-taking schema added in:

- `migrations/20260414152000_create_customer_orders.sql`

The schema is designed for customer orders where a user can choose **any one, any combination, or all** services offered by a launderer.

---

## Goals

- Support flexible service selection per order:
  - `washAndFold`
  - `dryCleaning`
  - `tailoring`
- Keep order-level data (customer, launderer, schedule, totals) separate from service-level details.
- Support itemized service rows (dry cleaning and tailoring items).
- Enforce ownership and visibility with Row Level Security (RLS).

---

## Tables

### 1) `public.customer_orders`

Order header table.

Core fields:

- `id` (uuid, PK)
- `customer_id` (uuid -> `auth.users.id`)
- `partner_id` (uuid -> `public.partner_profiles.id`)
- `status` (`draft | submitted | accepted | in_progress | ready | completed | cancelled`)
- `payment_status` (`pending | paid | failed | refunded`)
- `payment_method_type` (e.g. `card`)
- `payment_intent_id` (Stripe payment intent id)
- `paid_at`
- Estimate fields:
  - `currency_prefix`
  - `estimated_partial_total`
  - `estimated_total`
  - `pickup_fee`
- Schedule fields:
  - pickup: `pickup_date_iso`, `pickup_day_label`, `pickup_time_slot_label`, `pickup_instructions`
  - delivery: `delivery_date_iso`, `delivery_day_label`, `delivery_time_slot_label`, `delivery_instructions`
- Timestamps:
  - `submitted_at`, `created_at`, `updated_at`

Use this as the single source for order-level metadata.

---

### 2) `public.order_services`

One row per selected service in an order.

Core fields:

- `id` (uuid, PK)
- `order_id` (uuid -> `customer_orders.id`)
- `service_type` (`washAndFold | dryCleaning | tailoring`)
- `pricing_mode` (`per_item`)
- `total_item_count`
- `instructions`
- `estimated_amount`

Constraint:

- `unique (order_id, service_type)` ensures each service appears once per order.

---

### 3) `public.order_service_items`

Itemized lines for services that need quantity-by-item data.

Core fields:

- `id` (uuid, PK)
- `order_service_id` (uuid -> `order_services.id`)
- `service_type` (`washAndFold | dryCleaning | tailoring`)
- `item_key`
- `item_name`
- `quantity`
- `unit_price_display`
- `unit_price_amount`
- `line_total_amount`
- `created_at`, `updated_at`

Constraint:

- `unique (order_service_id, item_key)` avoids duplicate item rows for the same service line.

Typical use:

- Dry cleaning: suit/shirt/pants/etc.
- Tailoring: pants/shirt/suit/dress/etc.

---

## Relationship Diagram (Logical)

- `customer_orders` 1 -> many `order_services`
- `order_services` 1 -> many `order_service_items`

So an order can represent:

- only wash & fold (1 service row),
- only dry cleaning (1 service row + many item rows),
- dry cleaning + tailoring (2 service rows + item rows under each),
- all services (3 service rows).

---

## Write Flow (Recommended)

1. Insert into `customer_orders`.
2. Insert selected service rows into `order_services`.
3. For itemized services, insert rows into `order_service_items`.
4. Update `customer_orders.status` from `draft` to `submitted` when finalizing.

Wrap these writes in a transaction (or RPC) for consistency.

---

## Read Flow (Recommended)

For customer order history/details:

1. Read `customer_orders` by `customer_id`.
2. Fetch `order_services` by `order_id`.
3. Fetch `order_service_items` by `order_service_id`.

For launderer order queue:

1. Read `customer_orders` by `partner_id` and status.
2. Join/fetch nested service rows and item rows for processing.

---

## RLS Summary

Policies in the migration ensure:

- Customers can read/write their own orders and nested rows.
- Partners can read assigned orders and nested rows.
- Partners can update assigned order header rows (e.g., status progression).

All three order tables have RLS enabled.

---

## Indexing

Added indexes support common lookups:

- `customer_orders`: by `customer_id`, `partner_id`, `status`
- `order_services`: by `order_id`, `service_type`
- `order_service_items`: by `order_service_id`

---

## Notes / Future Enhancements

- Consider enum types for `status` and `service_type` if you want stricter schema typing.
- Add an order number column (human-readable) if required by product/UI.
- Add partner/customer snapshots (name/phone/address at time of order) if historical denormalization is needed.
- Consider an RPC to submit the entire order atomically from app draft data.
