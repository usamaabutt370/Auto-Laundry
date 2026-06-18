"use client";

import { PRODUCT_NAME } from "@/lib/branding";
import { theme } from "@/lib/theme/theme";
import type { AdminOrder, OrderStatus, ShippingService } from "@/features/admin/data/admin-orders";
import { AdminDesktopTable, AdminListPagination } from "@/features/admin/components/admin-list-ui";
import { useEffect, useMemo, useState } from "react";

type OrdersListProps = {
  orders: AdminOrder[];
};

type StatusFilter = "all" | OrderStatus;

const PAGE_SIZE = 10;

const ORDER_STATUSES: OrderStatus[] = [
  "Placed",
  "Accepted",
  "In Progress",
  "Ready",
  "Delivered",
  "Cancelled",
  "N/A",
];

const STATUS_PILL: Record<OrderStatus, { bg: string; fg: string; border: string }> = {
  Placed: { bg: "rgba(171, 233, 254, 0.2)", fg: "#ABE9FE", border: "rgba(171, 233, 254, 0.45)" },
  Accepted: { bg: "rgba(110, 231, 168, 0.18)", fg: "#6EE7A8", border: "rgba(110, 231, 168, 0.4)" },
  "In Progress": { bg: "rgba(246, 211, 107, 0.2)", fg: "#F6D36B", border: "rgba(246, 211, 107, 0.45)" },
  Ready: { bg: "rgba(123, 213, 233, 0.2)", fg: "#7BD5E9", border: "rgba(123, 213, 233, 0.45)" },
  Delivered: { bg: "rgba(110, 231, 168, 0.22)", fg: "#6EE7A8", border: "rgba(110, 231, 168, 0.45)" },
  Cancelled: { bg: "rgba(241, 140, 140, 0.22)", fg: "#F18C8C", border: "rgba(241, 140, 140, 0.45)" },
  "N/A": { bg: "rgba(160, 174, 192, 0.22)", fg: "#C6D0DF", border: "rgba(160, 174, 192, 0.45)" },
};

const SERVICE_DOT: Record<ShippingService, string> = {
  Standard: "#60a5fa",
  Priority: "#2dd4bf",
  Express: "#fb7185",
};

const statusPillClass = "admin-status-pill border text-[11px] font-semibold sm:text-xs";

const tableGridClass =
  "grid grid-cols-[minmax(84px,0.8fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(140px,1.2fr)_minmax(92px,0.8fr)_minmax(80px,0.7fr)_minmax(140px,1.2fr)_minmax(100px,0.85fr)] items-center gap-x-4 gap-y-1";

function matchesQuery(order: AdminOrder, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return (
    order.id.toLowerCase().includes(s) ||
    order.orderNumber.toLowerCase().includes(s) ||
    order.customer.toLowerCase().includes(s) ||
    order.partner.toLowerCase().includes(s) ||
    order.trackingCode.toLowerCase().includes(s) ||
    order.items.toLowerCase().includes(s)
  );
}

export function OrdersList({ orders }: OrdersListProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter]);

  const filteredOrders = useMemo(() => {
    const searched = orders.filter((o) => matchesQuery(o, query));
    if (statusFilter === "all") return searched;
    return searched.filter((o) => o.status === statusFilter);
  }, [orders, query, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const pagedOrders = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, page]);

  const total = filteredOrders.length;
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  const pageNumbers = useMemo(() => {
    if (pageCount <= 7) {
      return Array.from({ length: pageCount }, (_, i) => i + 1);
    }
    const nums: number[] = [];
    const windowStart = Math.max(2, page - 1);
    const windowEnd = Math.min(pageCount - 1, page + 1);
    nums.push(1);
    if (windowStart > 2) nums.push(-1);
    for (let n = windowStart; n <= windowEnd; n++) nums.push(n);
    if (windowEnd < pageCount - 1) nums.push(-1);
    nums.push(pageCount);
    return nums;
  }, [page, pageCount]);

  return (
    <section className="w-full min-w-0 space-y-3 sm:space-y-4">
      <div>
        <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold text-white">Orders</h1>
        <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-white/75 sm:text-[15px]">
          For {PRODUCT_NAME}: Super Admin can view customer orders and delivery lifecycle only.
        </p>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/45">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15zM21 21l-4.35-4.35"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by order ID, number, customer, partner, tracking…"
            className="w-full rounded-xl border py-2.5 pl-9 pr-3 text-[13px] text-white outline-none placeholder:text-white/40 focus-visible:ring-2 focus-visible:ring-[#ABE9FE] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            style={{
              borderColor: theme.colors.outline,
              backgroundColor: theme.colors.sidebarBackground,
            }}
          />
        </div>
        <label className="sr-only" htmlFor="orders-status-filter">
          Filter by status
        </label>
        <select
          id="orders-status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="admin-filter-select min-h-[44px] w-full cursor-pointer rounded-xl border py-2.5 pl-3 text-[13px] font-medium text-white outline-none sm:w-[min(100%,200px)]"
          style={{
            borderColor: theme.colors.outline,
            backgroundColor: theme.colors.sidebarBackground,
          }}
        >
          <option value="all">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <AdminDesktopTable minWidthClassName="w-full min-w-[1160px]">
          <div
            className={`sticky top-0 z-[1] ${tableGridClass} border-b px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-white/70 sm:text-xs`}
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              backgroundColor: theme.colors.sidebarBackground,
            }}
          >
            <span className="text-left">Order</span>
            <span className="text-left">Customer</span>
            <span className="text-left">Partner</span>
            <span className="text-left">Service</span>
            <span className="text-left">Delivery Type</span>
            <span className="text-right">Total</span>
            <span className="text-left">Tracking</span>
            <span className="text-right">Status</span>
          </div>
          {pagedOrders.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-white/60">No orders match your search or filters.</div>
          ) : null}
          {pagedOrders.map((order) => {
            const pill = STATUS_PILL[order.status];
            return (
              <button
                key={order.id}
                type="button"
                onClick={() => setSelectedOrder(order)}
                className={`${tableGridClass} w-full border-b px-4 py-2.5 text-[13px] text-white/85 transition hover:bg-white/[0.04] last:border-b-0 sm:py-3`}
                style={{ borderColor: "rgba(255,255,255,0.12)" }}
              >
                <span className="font-semibold leading-snug tabular-nums">{order.id}</span>
                <span className="min-w-0 truncate text-left" title={order.customer}>
                  {order.customer}
                </span>
                <span className="min-w-0 truncate text-left" title={order.partner}>
                  {order.partner}
                </span>
                <span className="min-w-0 truncate text-left" title={order.items}>
                  {order.items}
                </span>
                <span className="flex min-w-0 items-center gap-1.5 truncate text-left" title={order.shippingService}>
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: SERVICE_DOT[order.shippingService] }}
                  />
                  {order.shippingService}
                </span>
                <span className="text-right tabular-nums leading-none">{order.total}</span>
                <span className="min-w-0 truncate font-mono text-[11px] tabular-nums text-white/80 sm:text-xs" title={order.trackingCode}>
                  {order.trackingCode}
                </span>
                <div className="flex justify-end">
                  <span
                    className={`${statusPillClass} inline-flex rounded-full py-1 pl-2.5 pr-3`}
                    style={{
                      backgroundColor: pill.bg,
                      color: pill.fg,
                      borderColor: pill.border,
                    }}
                  >
                    {order.status}
                  </span>
                </div>
              </button>
            );
          })}
      </AdminDesktopTable>

      <div className="grid gap-3 md:hidden">
        {pagedOrders.length === 0 ? (
          <p className="rounded-xl border px-4 py-8 text-center text-sm text-white/60" style={{ borderColor: theme.colors.outline }}>
            No orders match your search or filters.
          </p>
        ) : null}
        {pagedOrders.map((order) => {
          const pill = STATUS_PILL[order.status];
          return (
            <button
              key={order.id}
              type="button"
              onClick={() => setSelectedOrder(order)}
              className="rounded-xl border p-3.5 text-left transition hover:bg-white/[0.04] sm:p-4"
              style={{
                borderColor: theme.colors.outline,
                backgroundColor: theme.colors.sidebarBackground,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[16px] font-bold tabular-nums text-white">{order.id}</p>
                  <p className="mt-0.5 text-[12px] tabular-nums text-white/65">#{order.orderNumber}</p>
                  <p className="mt-1 text-[12px] text-white/75">{order.total}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={`${statusPillClass} inline-flex rounded-full py-1.5 pl-3 pr-3.5`}
                  style={{
                    backgroundColor: pill.bg,
                    color: pill.fg,
                    borderColor: pill.border,
                  }}
                >
                  {order.status}
                </span>
              </div>
              <div className="mt-3 space-y-1 text-[12px] text-white/85 sm:text-[13px]">
                <p>
                  <span className="text-white/55">Customer</span>{" "}
                  <span className="font-medium text-white">{order.customer}</span>
                </p>
                <p>
                  <span className="text-white/55">Partner</span>{" "}
                  <span className="font-medium text-white">{order.partner}</span>
                </p>
                <p>
                  <span className="text-white/55">Items</span>{" "}
                  <span className="text-white">
                    {order.itemCount} · {order.items}
                  </span>
                </p>
                <p className="flex flex-wrap items-center gap-1.5">
                  <span className="text-white/55">Service</span>
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: SERVICE_DOT[order.shippingService] }}
                  />
                  <span className="font-medium text-white">{order.shippingService}</span>
                </p>
                <p className="break-all font-mono text-[11px] text-white/75">
                  <span className="text-white/55">Tracking</span> {order.trackingCode}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <AdminListPagination
        page={page}
        pageCount={pageCount}
        total={total}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        onPageChange={setPage}
        pageNumbers={pageNumbers}
      />

      {selectedOrder ? (
        <div className="fixed inset-0 z-[220] flex items-end justify-center p-3 sm:items-center sm:p-4" role="presentation">
          <button
            type="button"
            aria-label="Close order details"
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            onClick={() => setSelectedOrder(null)}
          />
          <section
            role="dialog"
            aria-modal="true"
            className="relative z-[221] w-full max-w-[760px] rounded-2xl border px-4 py-5 shadow-xl sm:px-6 sm:py-6"
            style={{ borderColor: theme.colors.filledButtonBorder, backgroundColor: theme.colors.sidebarBackground }}
          >
            <button
              type="button"
              onClick={() => setSelectedOrder(null)}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border text-[20px] font-semibold leading-none text-white transition hover:brightness-110"
              style={{ borderColor: theme.colors.filledButtonBorder, backgroundColor: theme.colors.secondary }}
              aria-label="Close modal"
            >
              ×
            </button>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Order detail</p>
            <h2 className="mt-1 pr-10 text-[18px] font-bold text-white sm:text-[22px]">{selectedOrder.id}</h2>
            <p className="mt-1 text-[12px] text-white/65">Order no: #{selectedOrder.orderNumber}</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <article className="rounded-xl border px-3.5 py-3" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Customer</p>
                <p className="mt-1 text-[14px] text-white">{selectedOrder.customer}</p>
              </article>
              <article className="rounded-xl border px-3.5 py-3" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Partner</p>
                <p className="mt-1 text-[14px] text-white">{selectedOrder.partner}</p>
              </article>
              <article className="rounded-xl border px-3.5 py-3" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Items</p>
                <p className="mt-1 text-[14px] text-white">{selectedOrder.itemCount} · {selectedOrder.items}</p>
              </article>
              <article className="rounded-xl border px-3.5 py-3" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Delivery Type</p>
                <p className="mt-1 flex items-center gap-1.5 text-[14px] text-white">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: SERVICE_DOT[selectedOrder.shippingService] }} />
                  {selectedOrder.shippingService}
                </p>
              </article>
              <article className="rounded-xl border px-3.5 py-3" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Tracking</p>
                <p className="mt-1 break-all font-mono text-[13px] text-white">{selectedOrder.trackingCode}</p>
              </article>
              <article className="rounded-xl border px-3.5 py-3" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Total</p>
                <p className="mt-1 text-[14px] font-semibold text-white">{selectedOrder.total}</p>
              </article>
            </div>
            <div className="mt-4">
              <span
                className={`${statusPillClass} inline-flex rounded-full py-1 pl-2.5 pr-3`}
                style={{
                  backgroundColor: STATUS_PILL[selectedOrder.status].bg,
                  color: STATUS_PILL[selectedOrder.status].fg,
                  borderColor: STATUS_PILL[selectedOrder.status].border,
                }}
              >
                {selectedOrder.status}
              </span>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
