"use client";

import { PRODUCT_NAME } from "@/lib/branding";
import { theme } from "@/lib/theme/theme";
import type { AdminPayment, PaymentKind, PaymentStatus } from "@/features/admin/data/payments-demo-data";
import { useEffect, useMemo, useState } from "react";

type PaymentsListProps = {
  payments: AdminPayment[];
};

type StatusFilter = "all" | PaymentStatus;
type KindFilter = "all" | PaymentKind;

const PAGE_SIZE = 10;

const PAYMENT_STATUSES: PaymentStatus[] = ["Succeeded", "Pending", "Failed", "Refunded"];

const PAYMENT_KINDS: PaymentKind[] = ["Customer charge", "Partner payout", "Refund", "Adjustment"];

const STATUS_PILL: Record<PaymentStatus, { bg: string; fg: string; border: string }> = {
  Succeeded: { bg: "rgba(110, 231, 168, 0.2)", fg: "#6EE7A8", border: "rgba(110, 231, 168, 0.45)" },
  Pending: { bg: "rgba(246, 211, 107, 0.2)", fg: "#F6D36B", border: "rgba(246, 211, 107, 0.45)" },
  Failed: { bg: "rgba(241, 140, 140, 0.22)", fg: "#F18C8C", border: "rgba(241, 140, 140, 0.45)" },
  Refunded: { bg: "rgba(171, 233, 254, 0.2)", fg: "#ABE9FE", border: "rgba(171, 233, 254, 0.45)" },
};

const statusPillClass = "admin-status-pill border text-[11px] font-semibold sm:text-xs";

const tableGridClass =
  "grid grid-cols-[minmax(86px,0.75fr)_minmax(126px,1.1fr)_minmax(94px,0.85fr)_minmax(94px,0.85fr)_minmax(110px,1fr)_minmax(88px,0.8fr)_minmax(90px,0.8fr)_minmax(88px,0.75fr)] items-center gap-x-2 gap-y-1 sm:gap-x-3";

function parseCurrency(value: string): number {
  const n = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function matchesQuery(payment: AdminPayment, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return (
    payment.id.toLowerCase().includes(s) ||
    payment.orderId.toLowerCase().includes(s) ||
    payment.customer.toLowerCase().includes(s) ||
    payment.method.toLowerCase().includes(s) ||
    payment.kind.toLowerCase().includes(s) ||
    payment.amount.toLowerCase().includes(s)
  );
}

export function PaymentsList({ payments }: PaymentsListProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, kindFilter]);

  const filteredPayments = useMemo(() => {
    const searched = payments.filter((p) => matchesQuery(p, query));
    const byStatus = statusFilter === "all" ? searched : searched.filter((p) => p.status === statusFilter);
    return kindFilter === "all" ? byStatus : byStatus.filter((p) => p.kind === kindFilter);
  }, [payments, query, statusFilter, kindFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredPayments.length / PAGE_SIZE));

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const pagedPayments = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredPayments.slice(start, start + PAGE_SIZE);
  }, [filteredPayments, page]);

  const total = filteredPayments.length;
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
        <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold text-white">Payments</h1>
        <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-white/75 sm:text-[15px]">
          For {PRODUCT_NAME}: user payment is reserved first, 10% commission is deducted at completion, partner payout
          is released, and refund is possible if user raises a complaint.
        </p>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <div className="relative min-w-0 flex-1 sm:min-w-[200px]">
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
            placeholder="Search by payment ID, order, customer, payout, refund…"
            className="w-full rounded-xl border py-2.5 pl-9 pr-3 text-[13px] text-white outline-none placeholder:text-white/40 focus-visible:ring-2 focus-visible:ring-[#ABE9FE] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            style={{
              borderColor: theme.colors.outline,
              backgroundColor: theme.colors.sidebarBackground,
            }}
          />
        </div>
        <label className="sr-only" htmlFor="payments-kind-filter">
          Filter by type
        </label>
        <select
          id="payments-kind-filter"
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value as KindFilter)}
          className="admin-filter-select min-h-[44px] w-full cursor-pointer rounded-xl border py-2.5 pl-3 text-[13px] font-medium text-white outline-none sm:w-[min(100%,220px)]"
          style={{
            borderColor: theme.colors.outline,
            backgroundColor: theme.colors.sidebarBackground,
          }}
        >
          <option value="all">All types</option>
          {PAYMENT_KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="payments-status-filter">
          Filter by status
        </label>
        <select
          id="payments-status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="admin-filter-select min-h-[44px] w-full cursor-pointer rounded-xl border py-2.5 pl-3 text-[13px] font-medium text-white outline-none sm:w-[min(100%,200px)]"
          style={{
            borderColor: theme.colors.outline,
            backgroundColor: theme.colors.sidebarBackground,
          }}
        >
          <option value="all">All statuses</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div
        className="scrollbar-hidden hidden min-w-0 overflow-x-auto rounded-xl border md:block [-webkit-overflow-scrolling:touch]"
        style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}
      >
        <div className="min-w-[1080px]">
          <div
            className={`sticky top-0 z-[1] ${tableGridClass} border-b px-3 py-3 text-[11px] font-bold uppercase tracking-wide text-white/70 sm:px-4 sm:text-xs`}
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              backgroundColor: theme.colors.sidebarBackground,
            }}
          >
            <span className="text-left">Order</span>
            <span className="text-left">Customer</span>
            <span className="text-right">Reserved</span>
            <span className="text-right">10% Fee</span>
            <span className="text-right">Partner Payout</span>
            <span className="text-right">Refund</span>
            <span className="text-right">Status</span>
            <span className="text-right">Date</span>
          </div>
          {pagedPayments.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-white/60">No payments match your search or filters.</div>
          ) : null}
          {pagedPayments.map((payment) => {
            const pill = STATUS_PILL[payment.status];
            const amount = Math.abs(parseCurrency(payment.amount));
            const reserved = payment.kind === "Customer charge" ? amount : 0;
            const commission = reserved > 0 ? Math.round(reserved * 0.1 * 100) / 100 : 0;
            const partnerPayout =
              payment.kind === "Partner payout" ? amount : reserved > 0 ? Math.round((reserved - commission) * 100) / 100 : 0;
            const refund = payment.kind === "Refund" ? amount : 0;
            return (
              <div
                key={payment.id}
                className={`${tableGridClass} border-b px-3 py-2.5 text-xs text-white/85 last:border-b-0 sm:px-4 sm:py-3 sm:text-sm`}
                style={{ borderColor: "rgba(255,255,255,0.12)" }}
              >
                <span className="font-mono text-[11px] tabular-nums text-white/80 sm:text-xs">{payment.orderId}</span>
                <span className="min-w-0 truncate text-left" title={payment.customer}>
                  {payment.customer}
                </span>
                <span className="text-right tabular-nums text-white/90">
                  {reserved > 0 ? formatCurrency(reserved) : "—"}
                </span>
                <span className="text-right tabular-nums text-white/85">
                  {commission > 0 ? formatCurrency(commission) : "—"}
                </span>
                <span className="text-right tabular-nums font-medium text-white">
                  {partnerPayout > 0 ? formatCurrency(partnerPayout) : "—"}
                </span>
                <span className="text-right tabular-nums text-white/85">
                  {refund > 0 ? formatCurrency(refund) : "—"}
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
                    {payment.status}
                  </span>
                </div>
                <span className="text-right tabular-nums text-white/75">{payment.createdAt}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 md:hidden">
        {pagedPayments.length === 0 ? (
          <p className="rounded-xl border px-4 py-8 text-center text-sm text-white/60" style={{ borderColor: theme.colors.outline }}>
            No payments match your search or filters.
          </p>
        ) : null}
        {pagedPayments.map((payment) => {
          const pill = STATUS_PILL[payment.status];
          return (
            <article
              key={payment.id}
              className="rounded-xl border p-3.5 sm:p-4"
              style={{
                borderColor: theme.colors.outline,
                backgroundColor: theme.colors.sidebarBackground,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[16px] font-bold tabular-nums text-white">{payment.id}</p>
                  <p className="mt-0.5 font-mono text-[12px] text-white/65">{payment.orderId}</p>
                  <p className="mt-1 text-[13px] text-white/80">{payment.customer}</p>
                </div>
              </div>
              {(() => {
                const amount = Math.abs(parseCurrency(payment.amount));
                const reserved = payment.kind === "Customer charge" ? amount : 0;
                const commission = reserved > 0 ? Math.round(reserved * 0.1 * 100) / 100 : 0;
                const partnerPayout =
                  payment.kind === "Partner payout"
                    ? amount
                    : reserved > 0
                      ? Math.round((reserved - commission) * 100) / 100
                      : 0;
                const refund = payment.kind === "Refund" ? amount : 0;
                return (
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px] text-white/85 sm:text-[13px]">
                    <p>
                      <span className="text-white/55">Reserved</span>{" "}
                      <span className="tabular-nums text-white">{reserved > 0 ? formatCurrency(reserved) : "—"}</span>
                    </p>
                    <p className="text-right">
                      <span className="text-white/55">10% Fee</span>{" "}
                      <span className="tabular-nums text-white">{commission > 0 ? formatCurrency(commission) : "—"}</span>
                    </p>
                    <p>
                      <span className="text-white/55">Payout</span>{" "}
                      <span className="tabular-nums text-white">{partnerPayout > 0 ? formatCurrency(partnerPayout) : "—"}</span>
                    </p>
                    <p className="text-right">
                      <span className="text-white/55">Refund</span>{" "}
                      <span className="tabular-nums text-white">{refund > 0 ? formatCurrency(refund) : "—"}</span>
                    </p>
                  </div>
                );
              })()}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={`${statusPillClass} inline-flex rounded-full py-1.5 pl-3 pr-3.5`}
                  style={{
                    backgroundColor: pill.bg,
                    color: pill.fg,
                    borderColor: pill.border,
                  }}
                >
                  {payment.status}
                </span>
              </div>
              <div className="mt-3 space-y-1 text-[12px] text-white/85 sm:text-[13px]">
                <p>
                  <span className="text-white/55">Type</span>{" "}
                  <span className="text-white">{payment.kind}</span>
                </p>
                <p>
                  <span className="text-white/55">Method</span>{" "}
                  <span className="text-white">{payment.method}</span>
                </p>
                <p className="tabular-nums">
                  <span className="text-white/55">Date</span> {payment.createdAt}
                </p>
              </div>
            </article>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] text-white/65 sm:text-sm">
          Showing{" "}
          <span className="font-semibold text-white/85">
            {rangeStart} to {rangeEnd}
          </span>{" "}
          of <span className="font-semibold text-white/85">{total}</span> results
        </p>
        {total > 0 ? (
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="min-h-[36px] min-w-[36px] rounded-lg border text-[13px] font-semibold text-white/85 transition enabled:hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-35"
              style={{ borderColor: theme.colors.outline }}
              aria-label="Previous page"
            >
              ‹
            </button>
            {pageNumbers.map((n, i) =>
              n === -1 ? (
                <span key={`e-${i}`} className="px-1 text-white/45">
                  …
                </span>
              ) : (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className="min-h-[36px] min-w-[36px] rounded-lg border text-[13px] font-semibold transition"
                  style={{
                    borderColor: page === n ? "#ABE9FE" : theme.colors.outline,
                    backgroundColor: page === n ? "rgba(171, 233, 254, 0.12)" : "transparent",
                    color: theme.colors.themeWhite,
                  }}
                  aria-label={`Page ${n}`}
                  aria-current={page === n ? "page" : undefined}
                >
                  {n}
                </button>
              ),
            )}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page >= pageCount}
              className="min-h-[36px] min-w-[36px] rounded-lg border text-[13px] font-semibold text-white/85 transition enabled:hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-35"
              style={{ borderColor: theme.colors.outline }}
              aria-label="Next page"
            >
              ›
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
