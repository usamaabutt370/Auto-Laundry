"use client";

import { PRODUCT_NAME } from "@/lib/branding";
import { theme } from "@/lib/theme/theme";
import type { AdminDispute, DisputeCategory, DisputeStatus } from "@/features/admin/types/admin-dispute";
import {
  AdminDesktopTable,
  AdminListPagination,
  adminPaginationView,
  useAdminListUrl,
  useDebouncedListSearch,
} from "@/features/admin/components/admin-list-ui";
import type { PaginatedResult } from "@/features/admin/server/admin-list-query";
import { useEffect, useState } from "react";

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
  "grid grid-cols-[minmax(88px,0.75fr)_minmax(88px,0.75fr)_minmax(120px,1.05fr)_minmax(120px,1.05fr)_minmax(112px,0.95fr)_minmax(160px,1.35fr)_minmax(100px,0.9fr)_minmax(88px,0.75fr)_minmax(88px,0.75fr)] items-center gap-x-4 gap-y-1";

type DisputesListProps = {
  data: PaginatedResult<AdminDispute>;
};

export function DisputesList({ data }: DisputesListProps) {
  const { searchParams, push, setPage } = useAdminListUrl();
  const { query, setQuery } = useDebouncedListSearch();
  const statusFilter = (searchParams.get("status") ?? "all") as StatusFilter;
  const categoryFilter = (searchParams.get("category") ?? "all") as CategoryFilter;
  const [selectedDispute, setSelectedDispute] = useState<AdminDispute | null>(null);
  const disputes = data.items;
  const { pageCount, rangeStart, rangeEnd, pageNumbers } = adminPaginationView(data);

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
          For {PRODUCT_NAME}: review customer-reported problems from the mobile app — damaged items, missed
          pickups, billing, delivery, and more. Reports are sent to admin only, not partners.
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
          onChange={(e) => {
            const value = e.target.value as CategoryFilter;
            push({ category: value === "all" ? null : value }, true);
          }}
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
          onChange={(e) => {
            const value = e.target.value as StatusFilter;
            push({ status: value === "all" ? null : value }, true);
          }}
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

      <AdminDesktopTable minWidthClassName="w-full min-w-[1220px]">
          <div
            className={`sticky top-0 z-[1] ${tableGridClass} border-b px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-white/70 sm:text-xs`}
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
          {disputes.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-white/60">No disputes match your search or filters.</div>
          ) : null}
          {disputes.map((dispute) => {
            const pill = STATUS_PILL[dispute.status];
            return (
              <button
                type="button"
                key={dispute.id}
                onClick={() => setSelectedDispute(dispute)}
                className={`${tableGridClass} w-full border-b px-4 py-2.5 text-left text-[13px] text-white/85 transition hover:bg-white/[0.04] last:border-b-0 sm:py-3`}
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
      </AdminDesktopTable>

      <div className="grid gap-3 md:hidden">
        {disputes.length === 0 ? (
          <p className="rounded-xl border px-4 py-8 text-center text-sm text-white/60" style={{ borderColor: theme.colors.outline }}>
            No disputes match your search or filters.
          </p>
        ) : null}
        {disputes.map((dispute) => {
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

      <AdminListPagination
        page={data.page}
        pageCount={pageCount}
        total={data.total}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        onPageChange={setPage}
        pageNumbers={pageNumbers}
      />

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
                <dt className="text-[11px] font-medium text-white/55">Description</dt>
                <dd className="mt-1 rounded-xl border px-3 py-2.5 leading-relaxed text-white/90" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
                  {selectedDispute.description || selectedDispute.summary}
                </dd>
              </div>
              {selectedDispute.imageUrls.length > 0 ? (
                <div>
                  <dt className="text-[11px] font-medium text-white/55">Photos</dt>
                  <dd className="mt-2 flex flex-wrap gap-2">
                    {selectedDispute.imageUrls.map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="block overflow-hidden rounded-lg border"
                        style={{ borderColor: "rgba(255,255,255,0.12)" }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="Dispute evidence" className="h-24 w-24 object-cover" />
                      </a>
                    ))}
                  </dd>
                </div>
              ) : null}
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
