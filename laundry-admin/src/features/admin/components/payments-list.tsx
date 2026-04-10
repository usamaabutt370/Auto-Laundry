"use client";

import { ConfirmModal } from "@/components/ui/confirm-modal";
import { PRODUCT_NAME } from "@/lib/branding";
import { theme } from "@/lib/theme/theme";
import type {
  AdminPayment,
  EscrowStatus,
  PaymentStatus,
  PaymentTiming,
  PayoutStatus,
} from "@/features/admin/data/payments-demo-data";
import { useEffect, useMemo, useState } from "react";

type PaymentsListProps = {
  payments: AdminPayment[];
};

type StatusFilter = "all" | PaymentStatus;
type TimingFilter = "all" | PaymentTiming;
type EscrowFilter = "all" | EscrowStatus;
type PayoutFilter = "all" | PayoutStatus;
type DateFilter = "all" | "week" | "month";

const PAGE_SIZE = 10;

const PAYMENT_STATUSES: PaymentStatus[] = ["Succeeded", "Pending", "Failed", "Refunded"];
const PAYMENT_TIMINGS: PaymentTiming[] = ["Paid at order", "Paid at completion"];
const ESCROW_STATUSES: EscrowStatus[] = ["Awaiting payment", "In escrow", "Ready for payout", "Released", "Refunded", "Failed"];
const PAYOUT_STATUSES: PayoutStatus[] = ["Not ready", "Ready", "Sent", "On hold", "Failed"];

const STATUS_PILL: Record<PaymentStatus, { bg: string; fg: string; border: string }> = {
  Succeeded: { bg: "rgba(110, 231, 168, 0.2)", fg: "#6EE7A8", border: "rgba(110, 231, 168, 0.45)" },
  Pending: { bg: "rgba(246, 211, 107, 0.2)", fg: "#F6D36B", border: "rgba(246, 211, 107, 0.45)" },
  Failed: { bg: "rgba(241, 140, 140, 0.22)", fg: "#F18C8C", border: "rgba(241, 140, 140, 0.45)" },
  Refunded: { bg: "rgba(171, 233, 254, 0.2)", fg: "#ABE9FE", border: "rgba(171, 233, 254, 0.45)" },
};

const ESCROW_PILL: Record<EscrowStatus, { bg: string; fg: string; border: string }> = {
  "Awaiting payment": { bg: "rgba(255, 255, 255, 0.08)", fg: "rgba(233, 247, 252, 0.85)", border: "rgba(255, 255, 255, 0.2)" },
  "In escrow": { bg: "rgba(171, 233, 254, 0.2)", fg: "#ABE9FE", border: "rgba(171, 233, 254, 0.45)" },
  "Ready for payout": { bg: "rgba(246, 211, 107, 0.2)", fg: "#F6D36B", border: "rgba(246, 211, 107, 0.45)" },
  Released: { bg: "rgba(110, 231, 168, 0.2)", fg: "#6EE7A8", border: "rgba(110, 231, 168, 0.45)" },
  Refunded: { bg: "rgba(171, 233, 254, 0.2)", fg: "#ABE9FE", border: "rgba(171, 233, 254, 0.45)" },
  Failed: { bg: "rgba(241, 140, 140, 0.22)", fg: "#F18C8C", border: "rgba(241, 140, 140, 0.45)" },
};

const PAYOUT_PILL: Record<PayoutStatus, { bg: string; fg: string; border: string }> = {
  "Not ready": { bg: "rgba(255, 255, 255, 0.08)", fg: "rgba(233, 247, 252, 0.85)", border: "rgba(255, 255, 255, 0.2)" },
  Ready: { bg: "rgba(246, 211, 107, 0.2)", fg: "#F6D36B", border: "rgba(246, 211, 107, 0.45)" },
  Sent: { bg: "rgba(110, 231, 168, 0.2)", fg: "#6EE7A8", border: "rgba(110, 231, 168, 0.45)" },
  "On hold": { bg: "rgba(171, 233, 254, 0.2)", fg: "#ABE9FE", border: "rgba(171, 233, 254, 0.45)" },
  Failed: { bg: "rgba(241, 140, 140, 0.22)", fg: "#F18C8C", border: "rgba(241, 140, 140, 0.45)" },
};

const statusPillClass = "admin-status-pill border text-[11px] font-semibold sm:text-xs";
const tableGridClass =
  "grid grid-cols-[minmax(88px,0.8fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(112px,0.95fr)_minmax(88px,0.8fr)_minmax(88px,0.8fr)_minmax(92px,0.8fr)_minmax(108px,0.95fr)_minmax(96px,0.85fr)_minmax(96px,0.85fr)] items-center gap-x-2 gap-y-1 sm:gap-x-3";

function parseCurrency(value: string): number {
  const n = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function timelineFor(payment: AdminPayment): string[] {
  const lines = [`Order created (${payment.createdAt})`];
  lines.push(payment.paymentTiming === "Paid at order" ? "Customer charged at order placement" : "Customer pays at completion");
  lines.push(payment.escrowStatus === "Awaiting payment" ? "Awaiting customer payment" : `Escrow state: ${payment.escrowStatus}`);
  lines.push(payment.orderCompletedAt ? `Order completed (${payment.orderCompletedAt})` : "Order completion pending");
  lines.push(`Commission deducted (${Math.round(payment.commissionRate * 100)}%)`);
  lines.push(payment.payoutProcessedAt ? `Partner payout sent (${payment.payoutProcessedAt})` : `Payout state: ${payment.payoutStatus}`);
  if (payment.status === "Refunded") lines.push("Refund/adjustment processed");
  return lines;
}

function matchesQuery(payment: AdminPayment, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return (
    payment.id.toLowerCase().includes(s) ||
    payment.orderId.toLowerCase().includes(s) ||
    payment.customer.toLowerCase().includes(s) ||
    payment.partner.toLowerCase().includes(s) ||
    payment.method.toLowerCase().includes(s)
  );
}

export function PaymentsList({ payments }: PaymentsListProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [timingFilter, setTimingFilter] = useState<TimingFilter>("all");
  const [escrowFilter, setEscrowFilter] = useState<EscrowFilter>("all");
  const [payoutFilter, setPayoutFilter] = useState<PayoutFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [page, setPage] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState<AdminPayment | null>(null);
  const [withdrawnTotal, setWithdrawnTotal] = useState(0);
  const [lastWithdrawAt, setLastWithdrawAt] = useState<string | null>(null);
  const [withdrawConfirmOpen, setWithdrawConfirmOpen] = useState(false);
  const [withdrawInProgress, setWithdrawInProgress] = useState(false);

  const filteredPayments = useMemo(() => {
    const searched = payments.filter((p) => matchesQuery(p, query));
    const byStatus = statusFilter === "all" ? searched : searched.filter((p) => p.status === statusFilter);
    const byTiming = timingFilter === "all" ? byStatus : byStatus.filter((p) => p.paymentTiming === timingFilter);
    const byEscrow = escrowFilter === "all" ? byTiming : byTiming.filter((p) => p.escrowStatus === escrowFilter);
    const byPayout = payoutFilter === "all" ? byEscrow : byEscrow.filter((p) => p.payoutStatus === payoutFilter);
    if (dateFilter === "all") return byPayout;
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() - (dateFilter === "week" ? 7 : 30));
    return byPayout.filter((p) => new Date(`${p.updatedAt}T00:00:00`) >= cutoff);
  }, [payments, query, statusFilter, timingFilter, escrowFilter, payoutFilter, dateFilter]);

  const summary = useMemo(() => {
    const escrowBalance = filteredPayments
      .filter((p) => p.escrowStatus === "In escrow")
      .reduce((sum, p) => sum + parseCurrency(p.grossAmount), 0);
    const readyForPayout = filteredPayments
      .filter((p) => p.payoutStatus === "Ready")
      .reduce((sum, p) => sum + parseCurrency(p.partnerNet), 0);
    const commissionEarned = filteredPayments
      .filter((p) => p.status === "Succeeded" && p.escrowStatus !== "In escrow")
      .reduce((sum, p) => sum + parseCurrency(p.commissionAmount), 0);
    const refundsIssued = filteredPayments
      .filter((p) => p.status === "Refunded")
      .reduce((sum, p) => sum + parseCurrency(p.grossAmount), 0);

    return {
      escrowBalance,
      readyForPayout,
      commissionEarned,
      refundsIssued,
    };
  }, [filteredPayments]);

  const summaryCards = useMemo(
    () => [
      { id: "escrow", label: "Escrow balance", value: formatCurrency(summary.escrowBalance) },
      { id: "ready", label: "Ready for payout", value: formatCurrency(summary.readyForPayout) },
      { id: "commission", label: "Commission earned", value: formatCurrency(summary.commissionEarned) },
      { id: "refund", label: "Refunds issued", value: formatCurrency(summary.refundsIssued) },
    ],
    [summary],
  );

  const withdrawableAmount = Math.max(0, summary.commissionEarned - withdrawnTotal);
  const withdrawDestination = "Treasury Account •••• 9031";

  const pageCount = Math.max(1, Math.ceil(filteredPayments.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);

  const pagedPayments = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredPayments.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredPayments]);

  const total = filteredPayments.length;
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, total);

  const pageNumbers = useMemo(() => {
    if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
    const nums: number[] = [];
    const windowStart = Math.max(2, currentPage - 1);
    const windowEnd = Math.min(pageCount - 1, currentPage + 1);
    nums.push(1);
    if (windowStart > 2) nums.push(-1);
    for (let n = windowStart; n <= windowEnd; n++) nums.push(n);
    if (windowEnd < pageCount - 1) nums.push(-1);
    nums.push(pageCount);
    return nums;
  }, [currentPage, pageCount]);

  useEffect(() => {
    if (!selectedPayment) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedPayment(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedPayment]);

  const handleWithdrawConfirm = () => {
    if (withdrawInProgress || withdrawableAmount <= 0) return;
    setWithdrawInProgress(true);
    window.setTimeout(() => {
      setWithdrawnTotal((prev) => prev + withdrawableAmount);
      setLastWithdrawAt(new Date().toLocaleString("en-US"));
      setWithdrawInProgress(false);
      setWithdrawConfirmOpen(false);
    }, 700);
  };

  return (
    <section className="w-full min-w-0 space-y-3 sm:space-y-4">
      <div>
        <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold text-white">Payments</h1>
        <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-white/75 sm:text-[15px]">
          For {PRODUCT_NAME}: Super Admin receives all customer payments, holds funds in escrow when needed, deducts
          commission at completion, and releases partner payout after order settlement.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <article
            key={card.id}
            className="rounded-xl border px-4 py-3.5"
            style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60">{card.label}</p>
            <p className="mt-1 text-[20px] font-bold tabular-nums text-white">{card.value}</p>
          </article>
        ))}
      </section>

      <section
        className="rounded-xl border p-4 sm:p-5"
        style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60">Super admin payout</p>
            <h2 className="mt-1 text-[22px] font-bold tabular-nums text-white sm:text-[26px]">
              {formatCurrency(withdrawableAmount)}
            </h2>
            <p className="mt-1 text-[12px] text-white/70 sm:text-[13px]">Available to withdraw</p>
          </div>
          <button
            type="button"
            onClick={() => setWithdrawConfirmOpen(true)}
            disabled={withdrawInProgress || withdrawableAmount <= 0}
            className="min-h-[42px] w-full rounded-xl border px-4 text-[14px] font-semibold text-white transition enabled:hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto sm:min-w-[180px]"
            style={{ borderColor: theme.colors.filledButtonBorder, backgroundColor: theme.colors.secondary }}
          >
            {withdrawInProgress ? "Withdrawing..." : "Withdraw payout"}
          </button>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <article className="rounded-lg border px-3 py-2.5" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
            <p className="text-[11px] text-white/55 sm:text-[12px]">Destination</p>
            <p className="mt-0.5 text-[13px] font-medium text-white sm:text-[14px]">{withdrawDestination}</p>
          </article>
          <article className="rounded-lg border px-3 py-2.5" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
            <p className="text-[11px] text-white/55 sm:text-[12px]">Last withdraw</p>
            <p className="mt-0.5 text-[13px] font-medium text-white sm:text-[14px]">{lastWithdrawAt ?? "Not yet"}</p>
          </article>
        </div>
      </section>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <div className="relative min-w-0 flex-1 sm:min-w-[220px]">
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
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by order, payment, customer, partner, method…"
            className="w-full rounded-xl border py-2.5 pl-9 pr-3 text-[13px] text-white outline-none placeholder:text-white/40 focus-visible:ring-2 focus-visible:ring-[#ABE9FE] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}
          />
        </div>
        <select
          value={timingFilter}
          onChange={(e) => {
            setTimingFilter(e.target.value as TimingFilter);
            setPage(1);
          }}
          className="admin-filter-select min-h-[44px] w-full cursor-pointer rounded-xl border py-2.5 pl-3 text-[13px] font-medium text-white outline-none sm:w-[190px]"
          style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}
        >
          <option value="all">All timings</option>
          {PAYMENT_TIMINGS.map((timing) => (
            <option key={timing} value={timing}>
              {timing}
            </option>
          ))}
        </select>
        <select
          value={escrowFilter}
          onChange={(e) => {
            setEscrowFilter(e.target.value as EscrowFilter);
            setPage(1);
          }}
          className="admin-filter-select min-h-[44px] w-full cursor-pointer rounded-xl border py-2.5 pl-3 text-[13px] font-medium text-white outline-none sm:w-[200px]"
          style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}
        >
          <option value="all">All escrow states</option>
          {ESCROW_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <select
          value={payoutFilter}
          onChange={(e) => {
            setPayoutFilter(e.target.value as PayoutFilter);
            setPage(1);
          }}
          className="admin-filter-select min-h-[44px] w-full cursor-pointer rounded-xl border py-2.5 pl-3 text-[13px] font-medium text-white outline-none sm:w-[170px]"
          style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}
        >
          <option value="all">All payouts</option>
          {PAYOUT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <select
          value={dateFilter}
          onChange={(e) => {
            setDateFilter(e.target.value as DateFilter);
            setPage(1);
          }}
          className="admin-filter-select min-h-[44px] w-full cursor-pointer rounded-xl border py-2.5 pl-3 text-[13px] font-medium text-white outline-none sm:w-[140px]"
          style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}
        >
          <option value="all">All dates</option>
          <option value="week">Last 7 days</option>
          <option value="month">Last 30 days</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as StatusFilter);
            setPage(1);
          }}
          className="admin-filter-select min-h-[44px] w-full cursor-pointer rounded-xl border py-2.5 pl-3 text-[13px] font-medium text-white outline-none sm:w-[160px]"
          style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}
        >
          <option value="all">All results</option>
          {PAYMENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div
        className="scrollbar-hidden hidden min-w-0 overflow-x-auto rounded-xl border md:block [-webkit-overflow-scrolling:touch]"
        style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}
      >
        <div className="min-w-[1320px]">
          <div
            className={`sticky top-0 z-[1] ${tableGridClass} border-b px-3 py-3 text-[11px] font-bold uppercase tracking-wide text-white/70 sm:px-4 sm:text-xs`}
            style={{ borderColor: "rgba(255,255,255,0.12)", backgroundColor: theme.colors.sidebarBackground }}
          >
            <span className="text-left">Order</span>
            <span className="text-left">Customer</span>
            <span className="text-left">Partner</span>
            <span className="text-left">Payment timing</span>
            <span className="text-right">Gross</span>
            <span className="text-right">Commission</span>
            <span className="text-right">Partner net</span>
            <span className="text-right">Escrow</span>
            <span className="text-right">Payout</span>
            <span className="text-right">Updated</span>
          </div>
          {pagedPayments.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-white/60">No payments match your search or filters.</div>
          ) : null}
          {pagedPayments.map((payment) => (
            <button
              key={payment.id}
              type="button"
              onClick={() => setSelectedPayment(payment)}
              className={`${tableGridClass} w-full border-b px-3 py-2.5 text-left text-xs text-white/85 transition hover:bg-white/[0.04] last:border-b-0 sm:px-4 sm:py-3 sm:text-sm`}
              style={{ borderColor: "rgba(255,255,255,0.12)" }}
            >
              <span className="font-mono text-[11px] tabular-nums text-white/80 sm:text-xs">{payment.orderId}</span>
              <span className="min-w-0 truncate text-left" title={payment.customer}>
                {payment.customer}
              </span>
              <span className="min-w-0 truncate text-left" title={payment.partner}>
                {payment.partner}
              </span>
              <span className="text-left text-white/85">{payment.paymentTiming}</span>
              <span className="text-right tabular-nums text-white/95">{payment.grossAmount}</span>
              <span className="text-right tabular-nums text-white/85">{payment.commissionAmount}</span>
              <span className="text-right tabular-nums font-medium text-white">{payment.partnerNet}</span>
              <div className="flex justify-end">
                <span
                  className={`${statusPillClass} inline-flex rounded-full py-1 pl-2.5 pr-3`}
                  style={{
                    backgroundColor: ESCROW_PILL[payment.escrowStatus].bg,
                    color: ESCROW_PILL[payment.escrowStatus].fg,
                    borderColor: ESCROW_PILL[payment.escrowStatus].border,
                  }}
                >
                  {payment.escrowStatus}
                </span>
              </div>
              <div className="flex justify-end">
                <span
                  className={`${statusPillClass} inline-flex rounded-full py-1 pl-2.5 pr-3`}
                  style={{
                    backgroundColor: PAYOUT_PILL[payment.payoutStatus].bg,
                    color: PAYOUT_PILL[payment.payoutStatus].fg,
                    borderColor: PAYOUT_PILL[payment.payoutStatus].border,
                  }}
                >
                  {payment.payoutStatus}
                </span>
              </div>
              <span className="text-right tabular-nums text-white/75">{payment.updatedAt}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:hidden">
        {pagedPayments.length === 0 ? (
          <p className="rounded-xl border px-4 py-8 text-center text-sm text-white/60" style={{ borderColor: theme.colors.outline }}>
            No payments match your search or filters.
          </p>
        ) : null}
        {pagedPayments.map((payment) => (
          <button
            key={payment.id}
            type="button"
            onClick={() => setSelectedPayment(payment)}
            className="w-full rounded-xl border p-3.5 text-left transition hover:bg-white/[0.04] sm:p-4"
            style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-[12px] text-white/70">{payment.orderId}</p>
                <p className="mt-0.5 text-[14px] font-bold text-white">{payment.customer}</p>
                <p className="mt-0.5 text-[12px] text-white/75">{payment.partner}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] text-white/85">
              <p>
                <span className="text-white/55">Gross</span> <span className="tabular-nums text-white">{payment.grossAmount}</span>
              </p>
              <p className="text-right">
                <span className="text-white/55">Fee</span> <span className="tabular-nums text-white">{payment.commissionAmount}</span>
              </p>
              <p>
                <span className="text-white/55">Net</span> <span className="tabular-nums text-white">{payment.partnerNet}</span>
              </p>
              <p className="text-right">
                <span className="text-white/55">Timing</span> <span className="text-white">{payment.paymentTiming}</span>
              </p>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`${statusPillClass} inline-flex rounded-full py-1.5 pl-3 pr-3.5`}
                style={{
                  backgroundColor: ESCROW_PILL[payment.escrowStatus].bg,
                  color: ESCROW_PILL[payment.escrowStatus].fg,
                  borderColor: ESCROW_PILL[payment.escrowStatus].border,
                }}
              >
                {payment.escrowStatus}
              </span>
              <span
                className={`${statusPillClass} inline-flex rounded-full py-1.5 pl-3 pr-3.5`}
                style={{
                  backgroundColor: PAYOUT_PILL[payment.payoutStatus].bg,
                  color: PAYOUT_PILL[payment.payoutStatus].fg,
                  borderColor: PAYOUT_PILL[payment.payoutStatus].border,
                }}
              >
                {payment.payoutStatus}
              </span>
              <span
                className={`${statusPillClass} inline-flex rounded-full py-1.5 pl-3 pr-3.5`}
                style={{
                  backgroundColor: STATUS_PILL[payment.status].bg,
                  color: STATUS_PILL[payment.status].fg,
                  borderColor: STATUS_PILL[payment.status].border,
                }}
              >
                {payment.status}
              </span>
            </div>
          </button>
        ))}
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
              onClick={() => setPage((p) => Math.max(1, Math.min(p, pageCount) - 1))}
              disabled={currentPage <= 1}
              className="min-h-[36px] min-w-[36px] rounded-lg border text-[13px] font-semibold text-white/85 transition enabled:hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-35"
              style={{ borderColor: theme.colors.outline }}
              aria-label="Previous page"
            >
              ‹
            </button>
            {pageNumbers.map((n, i) =>
              n === -1 ? (
                <span key={`e-${i}`} className="px-1 text-white/45">
                  ...
                </span>
              ) : (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className="min-h-[36px] min-w-[36px] rounded-lg border text-[13px] font-semibold transition"
                  style={{
                    borderColor: currentPage === n ? "#ABE9FE" : theme.colors.outline,
                    backgroundColor: currentPage === n ? "rgba(171, 233, 254, 0.12)" : "transparent",
                    color: theme.colors.themeWhite,
                  }}
                  aria-label={`Page ${n}`}
                  aria-current={currentPage === n ? "page" : undefined}
                >
                  {n}
                </button>
              ),
            )}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount, Math.min(p, pageCount) + 1))}
              disabled={currentPage >= pageCount}
              className="min-h-[36px] min-w-[36px] rounded-lg border text-[13px] font-semibold text-white/85 transition enabled:hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-35"
              style={{ borderColor: theme.colors.outline }}
              aria-label="Next page"
            >
              ›
            </button>
          </div>
        ) : null}
      </div>

      {selectedPayment ? (
        <div className="fixed inset-0 z-[220] flex items-end justify-center p-3 sm:items-center sm:p-4" role="presentation">
          <button
            type="button"
            aria-label="Close payment details"
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            onClick={() => setSelectedPayment(null)}
          />
          <section
            role="dialog"
            aria-modal="true"
            className="relative z-[221] w-full max-w-[620px] rounded-2xl border px-4 py-5 shadow-xl sm:px-6 sm:py-6"
            style={{ borderColor: theme.colors.filledButtonBorder, backgroundColor: theme.colors.sidebarBackground }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Payment detail</p>
                <h2 className="mt-1 text-[18px] font-bold text-white sm:text-[22px]">{selectedPayment.id}</h2>
                <p className="mt-1 font-mono text-[12px] text-white/65">{selectedPayment.orderId}</p>
              </div>
              <span
                className={`${statusPillClass} inline-flex rounded-full py-1 pl-2.5 pr-3`}
                style={{
                  backgroundColor: STATUS_PILL[selectedPayment.status].bg,
                  color: STATUS_PILL[selectedPayment.status].fg,
                  borderColor: STATUS_PILL[selectedPayment.status].border,
                }}
              >
                {selectedPayment.status}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <article className="rounded-xl border p-3" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Amount breakdown</p>
                <dl className="mt-2 space-y-1 text-[13px] text-white/85">
                  <div className="flex justify-between gap-3">
                    <dt>Gross</dt>
                    <dd className="tabular-nums text-white">{selectedPayment.grossAmount}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Commission ({Math.round(selectedPayment.commissionRate * 100)}%)</dt>
                    <dd className="tabular-nums text-white">{selectedPayment.commissionAmount}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Partner net</dt>
                    <dd className="tabular-nums text-white">{selectedPayment.partnerNet}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Method</dt>
                    <dd className="text-white">{selectedPayment.method}</dd>
                  </div>
                </dl>
              </article>

              <article className="rounded-xl border p-3" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Lifecycle timeline</p>
                <ol className="mt-2 space-y-1.5 text-[13px] text-white/85">
                  {timelineFor(selectedPayment).map((line) => (
                    <li key={line} className="leading-relaxed">
                      • {line}
                    </li>
                  ))}
                </ol>
              </article>
            </div>

            <div className="mt-4 grid gap-2 text-[12px] text-white/80 sm:grid-cols-2 sm:text-[13px]">
              <p>
                <span className="text-white/55">Customer</span> <span className="text-white">{selectedPayment.customer}</span>
              </p>
              <p>
                <span className="text-white/55">Partner</span> <span className="text-white">{selectedPayment.partner}</span>
              </p>
              <p>
                <span className="text-white/55">Escrow state</span> <span className="text-white">{selectedPayment.escrowStatus}</span>
              </p>
              <p>
                <span className="text-white/55">Payout state</span> <span className="text-white">{selectedPayment.payoutStatus}</span>
              </p>
              {selectedPayment.disputeId ? (
                <p className="sm:col-span-2">
                  <span className="text-white/55">Related dispute</span> <span className="font-mono text-white">{selectedPayment.disputeId}</span>
                </p>
              ) : null}
            </div>

            <div className="mt-5">
              <button
                type="button"
                onClick={() => setSelectedPayment(null)}
                className="min-h-[42px] w-full rounded-xl border px-4 text-[14px] font-semibold text-white sm:w-auto sm:min-w-[120px]"
                style={{ borderColor: theme.colors.filledButtonBorder, backgroundColor: theme.colors.secondary }}
              >
                Close
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <ConfirmModal
        open={withdrawConfirmOpen}
        title="Confirm payout withdrawal"
        description={`Withdraw ${formatCurrency(withdrawableAmount)} to ${withdrawDestination}?`}
        confirmLabel={withdrawInProgress ? "Processing..." : "Confirm Withdraw"}
        cancelLabel="Cancel"
        onConfirm={handleWithdrawConfirm}
        onCancel={() => {
          if (withdrawInProgress) return;
          setWithdrawConfirmOpen(false);
        }}
      />
    </section>
  );
}
