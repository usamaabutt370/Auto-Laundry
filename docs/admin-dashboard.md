# Admin Dashboard — Content Spec

Dashboard page for the tap2laundry.com admin panel (`laundry-admin`).
All data comes from Supabase — no hardcoded or dummy content.

---

## Top Row — Quick Stats (4 cards)

| #   | Label           | Value                                                | Source Table                  |
| --- | --------------- | ---------------------------------------------------- | ----------------------------- |
| 1   | Total Orders    | All-time order count                                 | `customer_orders`             |
| 2   | Active Orders   | Orders with status: submitted, accepted, in_progress | `customer_orders`             |
| 3   | Total Customers | Registered users with role = 'customer'              | `profiles`                    |
| 4   | Total Partners  | Approved partners (onboarding status = 'approved')   | `partner_onboarding_requests` |

---

## Second Row — Needs Attention (action items)

| #   | Label               | Value                                                | Source Table                  | Links To       |
| --- | ------------------- | ---------------------------------------------------- | ----------------------------- | -------------- |
| 5   | Pending KYC         | Partners waiting for approval (status = 'submitted') | `partner_onboarding_requests` | `/partner-kyc` |
| 6   | Open Disputes       | Unresolved customer complaints (status = 'open')     | `order_disputes`              | `/disputes`    |
| 7   | Low Credit Partners | Partners with balance under 200 credits              | `partner_credit_accounts`     | `/credits`     |

---

## Third Row — Orders Breakdown

**8. Orders by Status — current month**

Count of orders per status for the current calendar month.

Statuses to show: `submitted`, `accepted`, `in_progress`, `completed`, `cancelled`, `rejected`

Only show statuses with at least 1 order.

---

## Fourth Row — Credits Activity

| #   | Label                        | Value                                          | Source Table              | Filter        |
| --- | ---------------------------- | ---------------------------------------------- | ------------------------- | ------------- |
| 9   | Credits Charged This Month   | SUM of amount where event_type = 'usage'       | `partner_credit_ledger`   | current month |
| 10  | Credits Added This Month     | SUM of amount where event_type = 'admin_topup' | `partner_credit_ledger`   | current month |
| 11  | Total Credits in Circulation | SUM of all partner balances                    | `partner_credit_accounts` | all time      |

---

## Fifth Row — Recent Activity

**12. Recent Orders** — last 5 orders

- Customer name, order status, created date

**13. Recent KYC Submissions** — last 5 partner applications

- Partner name, business name, submitted date, status

---

## Notes

- No revenue or dollar figures — credits are the unit (integer points, not currency)
- Pending KYC and Open Disputes cards should be visually highlighted (orange/red) if count > 0
- All data is real-time from Supabase, no hardcoded values
- Empty states: show "0" or "None" gracefully — tables may be empty early on
- Page is server-rendered (Next.js Server Component), no client-side fetching needed
