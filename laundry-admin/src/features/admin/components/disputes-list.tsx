"use client";

import { PRODUCT_NAME } from "@/lib/branding";
import { theme } from "@/lib/theme/theme";
import type { AdminDispute, DisputeCategory, DisputeStatus } from "@/features/admin/data/disputes-demo-data";
import { useEffect, useMemo, useState } from "react";

type DisputesListProps = {
  disputes: AdminDispute[];
};

type StatusFilter = "all" | DisputeStatus;
type CategoryFilter = "all" | DisputeCategory;

const PAGE_SIZE = 10;

const DISPUTE_STATUSES: DisputeStatus[] = ["Open", "Under review", "Resolved", "Closed"];

const DISPUTE_CATEGORIES: DisputeCategory[] = [
  "Damaged items",
  "Missed pickup",
  "Billing",
  "Delivery delay",
  "Wrong items",
  "Other",
];

const STATUS_PILL: Record<DisputeStatus, { bg: string; fg: string; border: string }> = {
  Open: { bg: "rgba(246, 211, 107, 0.2)", fg: "#F6D36B", border: "rgba(246, 211, 107, 0.45)" },
  "Under review": { bg: "rgba(171, 233, 254, 0.2)", fg: "#ABE9FE", border: "rgba(171, 233, 254, 0.45)" },
  Resolved: { bg: "rgba(110, 231, 168, 0.2)", fg: "#6EE7A8", border: "rgba(110, 231, 168, 0.45)" },
  Closed: { bg: "rgba(255, 255, 255, 0.08)", fg: "rgba(233, 247, 252, 0.85)", border: "rgba(255, 255, 255, 0.2)" },
};

const statusPillClass = "admin-status-pill border text-[11px] font-semibold sm:text-xs";

const tableGridClass =
  "grid grid-cols-[minmax(88px,0.75fr)_minmax(88px,0.75fr)_minmax(120px,1.05fr)_minmax(120px,1.05fr)_minmax(112px,0.95fr)_minmax(160px,1.35fr)_minmax(100px,0.9fr)_minmax(88px,0.75fr)_minmax(88px,0.75fr)] items-center gap-x-2 gap-y-1 sm:gap-x-3";

function matchesQuery(dispute: AdminDispute, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return (
    dispute.id.toLowerCase().includes(s) ||
    dispute.orderId.toLowerCase().includes(s) ||
    dispute.customer.toLowerCase().includes(s) ||
    dispute.partner.toLowerCase().includes(s) ||
    dispute.category.toLowerCase().includes(s) ||
    dispute.summary.toLowerCase().includes(s) ||
    dispute.status.toLowerCase().includes(s)
  );
}

export function DisputesList({ disputes }: DisputesListProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [page, setPage] = useState(1);
  const [selectedDispute, setSelectedDispute] = useState<AdminDispute | null>(null);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, categoryFilter]);

  const filteredDisputes = useMemo(() => {
    const searched = disputes.filter((d) => matchesQuery(d, query));
    const byStatus = statusFilter === "all" ? searched : searched.filter((d) => d.status === statusFilter);
    return categoryFilter === "all" ? byStatus : byStatus.filter((d) => d.category === categoryFilter);
  }, [disputes, query, statusFilter, categoryFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredDisputes.length / PAGE_SIZE));

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const pagedDisputes = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredDisputes.slice(start, start + PAGE_SIZE);
  }, [filteredDisputes, page]);

  const total = filteredDisputes.length;
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

  useEffect(() => {
    if (!selectedDispute) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedDispute(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedDispute]);

  return (
    <section className="w-full min-w-0 space-y-3 sm:space-y-4">
      <div>
        <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold text-white">Disputes</h1>
        <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-white/75 sm:text-[15px]">
          For {PRODUCT_NAME}: review customer issues about damaged items, missed pickups, billing, and delivery.
          Super Admin view is read-only in this demo.
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
            placeholder="Search by dispute ID, order, customer, partner, summary…"
            className="w-full rounded-xl border py-2.5 pl-9 pr-3 text-[13px] text-white outline-none placeholder:text-white/40 focus-visible:ring-2 focus-visible:ring-[#ABE9FE] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            style={{
              borderColor: theme.colors.outline,
              backgroundColor: theme.colors.sidebarBackground,
            }}
          />
        </div>
        <label className="sr-only" htmlFor="disputes-category-filter">
          Filter by category
        </label>
        <select
          id="disputes-category-filter"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
          className="admin-filter-select min-h-[44px] w-full cursor-pointer rounded-xl border py-2.5 pl-3 text-[13px] font-medium text-white outline-none sm:w-[min(100%,220px)]"
          style={{
            borderColor: theme.colors.outline,
            backgroundColor: theme.colors.sidebarBackground,
          }}
        >
          <option value="all">All categories</option>
          {DISPUTE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="disputes-status-filter">
          Filter by status
        </label>
        <select
          id="disputes-status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="admin-filter-select min-h-[44px] w-full cursor-pointer rounded-xl border py-2.5 pl-3 text-[13px] font-medium text-white outline-none sm:w-[min(100%,200px)]"
          style={{
            borderColor: theme.colors.outline,
            backgroundColor: theme.colors.sidebarBackground,
          }}
        >
          <option value="all">All statuses</option>
          {DISPUTE_STATUSES.map((s) => (
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
        <div className="min-w-[1180px]">
          <div
            className={`sticky top-0 z-[1] ${tableGridClass} border-b px-3 py-3 text-[11px] font-bold uppercase tracking-wide text-white/70 sm:px-4 sm:text-xs`}
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              backgroundColor: theme.colors.sidebarBackground,
            }}
          >
            <span className="text-left">Dispute ID</span>
            <span className="text-left">Order</span>
            <span className="text-left">Customer</span>
            <span className="text-left">Partner</span>
            <span className="text-left">Category</span>
            <span className="text-left">Summary</span>
            <span className="text-right">Status</span>
            <span className="text-right">Opened</span>
            <span className="text-right">Updated</span>
          </div>
          {pagedDisputes.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-white/60">No disputes match your search or filters.</div>
          ) : null}
          {pagedDisputes.map((dispute) => {
            const pill = STATUS_PILL[dispute.status];
            return (
              <button
                type="button"
                key={dispute.id}
                onClick={() => setSelectedDispute(dispute)}
                className={`${tableGridClass} w-full border-b px-3 py-2.5 text-left text-xs text-white/85 transition hover:bg-white/[0.04] last:border-b-0 sm:px-4 sm:py-3 sm:text-sm`}
                style={{ borderColor: "rgba(255,255,255,0.12)" }}
              >
                <span className="font-semibold leading-snug tabular-nums">{dispute.id}</span>
                <span className="font-mono text-[11px] tabular-nums text-white/80 sm:text-xs">{dispute.orderId}</span>
                <span className="min-w-0 truncate text-left" title={dispute.customer}>
                  {dispute.customer}
                </span>
                <span className="min-w-0 truncate text-left" title={dispute.partner}>
                  {dispute.partner}
                </span>
                <span className="min-w-0 truncate text-left text-white/90" title={dispute.category}>
                  {dispute.category}
                </span>
                <span className="min-w-0 truncate text-left text-white/90" title={dispute.summary}>
                  {dispute.summary}
                </span>
                <div className="flex justify-end">
                  <span
                    className={`${statusPillClass} inline-flex max-w-full rounded-full py-1 pl-2.5 pr-3`}
                    style={{
                      backgroundColor: pill.bg,
                      color: pill.fg,
                      borderColor: pill.border,
                    }}
                  >
                    {dispute.status}
                  </span>
                </div>
                <span className="text-right tabular-nums text-white/75">{dispute.openedAt}</span>
                <span className="text-right tabular-nums text-white/75">{dispute.updatedAt}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 md:hidden">
        {pagedDisputes.length === 0 ? (
          <p className="rounded-xl border px-4 py-8 text-center text-sm text-white/60" style={{ borderColor: theme.colors.outline }}>
            No disputes match your search or filters.
          </p>
        ) : null}
        {pagedDisputes.map((dispute) => {
          const pill = STATUS_PILL[dispute.status];
          return (
            <button
              type="button"
              key={dispute.id}
              onClick={() => setSelectedDispute(dispute)}
              className="w-full rounded-xl border p-3.5 text-left transition hover:bg-white/[0.04] sm:p-4"
              style={{
                borderColor: theme.colors.outline,
                backgroundColor: theme.colors.sidebarBackground,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[16px] font-bold tabular-nums text-white">{dispute.id}</p>
                  <p className="mt-0.5 font-mono text-[12px] text-white/65">{dispute.orderId}</p>
                  <p className="mt-1 text-[12px] text-white/75">{dispute.category}</p>
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
                  {dispute.status}
                </span>
              </div>
              <p className="mt-3 text-[13px] leading-snug text-white/90">
                {dispute.summary}
              </p>
              <div className="mt-3 space-y-1 text-[12px] text-white/85 sm:text-[13px]">
                <p>
                  <span className="text-white/55">Customer</span>{" "}
                  <span className="font-medium text-white">{dispute.customer}</span>
                </p>
                <p>
                  <span className="text-white/55">Partner</span>{" "}
                  <span className="font-medium text-white">{dispute.partner}</span>
                </p>
                <p className="tabular-nums">
                  <span className="text-white/55">Opened</span> {dispute.openedAt}
                </p>
                <p className="tabular-nums">
                  <span className="text-white/55">Updated</span> {dispute.updatedAt}
                </p>
              </div>
            </button>
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

      {selectedDispute ? (
        <div className="fixed inset-0 z-[220] flex items-end justify-center p-3 sm:items-center sm:p-4" role="presentation">
          <button
            type="button"
            aria-label="Close dispute details"
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            onClick={() => setSelectedDispute(null)}
          />
          <section
            role="dialog"
            aria-modal="true"
            className="relative z-[221] w-full max-w-[560px] rounded-2xl border px-4 py-5 shadow-xl sm:px-6 sm:py-6"
            style={{
              borderColor: theme.colors.filledButtonBorder,
              backgroundColor: theme.colors.sidebarBackground,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Dispute detail</p>
                <h2 className="mt-1 text-[18px] font-bold text-white sm:text-[22px]">{selectedDispute.id}</h2>
                <p className="mt-1 font-mono text-[12px] text-white/65">{selectedDispute.orderId}</p>
              </div>
              <span
                className={`${statusPillClass} inline-flex rounded-full py-1 pl-2.5 pr-3`}
                style={{
                  backgroundColor: STATUS_PILL[selectedDispute.status].bg,
                  color: STATUS_PILL[selectedDispute.status].fg,
                  borderColor: STATUS_PILL[selectedDispute.status].border,
                }}
              >
                {selectedDispute.status}
              </span>
            </div>

            <dl className="mt-4 grid gap-3 text-[13px] text-white/85 sm:text-[14px]">
              <div>
                <dt className="text-[11px] font-medium text-white/55">Category</dt>
                <dd className="mt-0.5 text-white">{selectedDispute.category}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium text-white/55">Customer</dt>
                <dd className="mt-0.5 text-white">{selectedDispute.customer}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium text-white/55">Partner</dt>
                <dd className="mt-0.5 text-white">{selectedDispute.partner}</dd>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-[11px] font-medium text-white/55">Opened</dt>
                  <dd className="mt-0.5 tabular-nums text-white">{selectedDispute.openedAt}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium text-white/55">Updated</dt>
                  <dd className="mt-0.5 tabular-nums text-white">{selectedDispute.updatedAt}</dd>
                </div>
              </div>
              <div>
                <dt className="text-[11px] font-medium text-white/55">Summary</dt>
                <dd className="mt-1 rounded-xl border px-3 py-2.5 leading-relaxed text-white/90" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
                  {selectedDispute.summary}
                </dd>
              </div>
            </dl>

            <div className="mt-5">
              <button
                type="button"
                onClick={() => setSelectedDispute(null)}
                className="min-h-[42px] w-full rounded-xl border px-4 text-[14px] font-semibold text-white sm:w-auto sm:min-w-[120px]"
                style={{ borderColor: theme.colors.filledButtonBorder, backgroundColor: theme.colors.secondary }}
              >
                Close
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
