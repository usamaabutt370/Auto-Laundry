"use client";

import { PRODUCT_NAME } from "@/lib/branding";
import { theme } from "@/lib/theme/theme";
import type { AdminPartnerKyc, PartnerKycStatus } from "@/features/admin/data/partner-kyc-demo-data";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type PartnerKycListProps = {
  partners: AdminPartnerKyc[];
};

type StatusFilter = "all" | PartnerKycStatus;

const PAGE_SIZE = 10;

const KYC_STATUSES: PartnerKycStatus[] = ["Pending", "Approved", "Rejected"];

const STATUS_PILL: Record<PartnerKycStatus, { bg: string; fg: string; border: string }> = {
  Pending: { bg: "rgba(246, 211, 107, 0.2)", fg: "#F6D36B", border: "rgba(246, 211, 107, 0.45)" },
  Approved: { bg: "rgba(110, 231, 168, 0.2)", fg: "#6EE7A8", border: "rgba(110, 231, 168, 0.45)" },
  Rejected: { bg: "rgba(241, 140, 140, 0.22)", fg: "#F18C8C", border: "rgba(241, 140, 140, 0.45)" },
};

const statusPillClass = "admin-status-pill border text-[11px] font-semibold sm:text-xs";

/**
 * Tuned desktop columns with a consistent gutter.
 * Gives Email and Submitted clearer breathing room while keeping Status/Actions tighter.
 */
const tableGridClass =
  "grid grid-cols-[minmax(96px,1fr)_minmax(124px,1.15fr)_minmax(116px,1fr)_minmax(150px,1.2fr)_minmax(112px,0.95fr)_minmax(176px,1.3fr)_minmax(98px,0.82fr)_minmax(88px,0.78fr)] items-center gap-x-4 gap-y-1";

function matchesQuery(row: AdminPartnerKyc, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return (
    row.id.toLowerCase().includes(s) ||
    row.businessName.toLowerCase().includes(s) ||
    row.partnerName.toLowerCase().includes(s) ||
    row.email.toLowerCase().includes(s) ||
    row.phone.toLowerCase().includes(s) ||
    row.documentsSummary.toLowerCase().includes(s) ||
    row.services.some((svc) => svc.toLowerCase().includes(s))
  );
}

export function PartnerKycList({ partners }: PartnerKycListProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter]);

  const filtered = useMemo(() => {
    const searched = partners.filter((p) => matchesQuery(p, query));
    if (statusFilter === "all") return searched;
    return searched.filter((p) => p.status === statusFilter);
  }, [partners, query, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const total = filtered.length;
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
        <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold text-white">Partner KYC</h1>
        <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-white/75 sm:text-[15px]">
          For {PRODUCT_NAME}: open a partner to view profile, status, services, business details, and earnings
          breakdown.
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
            placeholder="Search by KYC ID, business, name, email, phone…"
            className="w-full rounded-xl border py-2.5 pl-9 pr-3 text-[13px] text-white outline-none placeholder:text-white/40 focus-visible:ring-2 focus-visible:ring-[#ABE9FE] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            style={{
              borderColor: theme.colors.outline,
              backgroundColor: theme.colors.sidebarBackground,
            }}
          />
        </div>
        <label className="sr-only" htmlFor="kyc-status-filter">
          Filter by verification status
        </label>
        <select
          id="kyc-status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="admin-filter-select min-h-[44px] w-full cursor-pointer rounded-xl border py-2.5 pl-3 text-[13px] font-medium text-white outline-none sm:w-[min(100%,220px)]"
          style={{
            borderColor: theme.colors.outline,
            backgroundColor: theme.colors.sidebarBackground,
          }}
        >
          <option value="all">All statuses</option>
          {KYC_STATUSES.map((s) => (
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
        <div className="w-full min-w-[1180px]">
          <div
            className={`sticky top-0 z-[1] ${tableGridClass} border-b px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-white/70 sm:text-xs`}
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              backgroundColor: theme.colors.sidebarBackground,
            }}
          >
            <span className="text-left">KYC ID</span>
            <span className="text-left">Business</span>
            <span className="text-left">Name</span>
            <span className="text-left">Email</span>
            <span className="text-left">Submitted</span>
            <span className="text-left">Documents</span>
            <span className="text-left">Status</span>
            <span className="text-right">Actions</span>
          </div>
          {paged.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-white/60">
              No partner submissions match your search or filters.
            </div>
          ) : null}
          {paged.map((row) => {
            const pill = STATUS_PILL[row.status];
            return (
              <div
                key={row.id}
                className={`${tableGridClass} border-b px-4 py-2.5 text-xs text-white/85 last:border-b-0 sm:py-3 sm:text-sm`}
                style={{ borderColor: "rgba(255,255,255,0.12)" }}
              >
                <span className="text-left font-semibold tabular-nums leading-snug">{row.id}</span>
                <span className="min-w-0 truncate text-left" title={row.businessName}>
                  {row.businessName}
                </span>
                <span className="min-w-0 truncate text-left" title={row.partnerName}>
                  {row.partnerName}
                </span>
                <span
                  className="min-w-0 truncate text-left font-mono text-[11px] text-white/80 sm:text-xs"
                  title={row.email}
                >
                  {row.email}
                </span>
                <span className="whitespace-nowrap text-left tabular-nums text-white/85">{row.submittedAt}</span>
                <span className="min-w-0 truncate text-left text-[11px] text-white/75 sm:text-xs" title={row.documentsSummary}>
                  {row.documentsSummary}
                </span>
                <div className="flex justify-start">
                  <span
                    className={`${statusPillClass} inline-flex max-w-full rounded-full py-1 pl-2.5 pr-3`}
                    style={{
                      backgroundColor: pill.bg,
                      color: pill.fg,
                      borderColor: pill.border,
                    }}
                  >
                    {row.status}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  <Link
                    href={`/partner-kyc/${encodeURIComponent(row.id)}`}
                    className="rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition hover:bg-white/5 sm:text-xs"
                    style={{ borderColor: theme.colors.filledButtonBorder, color: theme.colors.themeWhite }}
                  >
                    View
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 md:hidden">
        {paged.length === 0 ? (
          <p className="rounded-xl border px-4 py-8 text-center text-sm text-white/60" style={{ borderColor: theme.colors.outline }}>
            No partner submissions match your search or filters.
          </p>
        ) : null}
        {paged.map((row) => {
          const pill = STATUS_PILL[row.status];
          return (
            <article
              key={row.id}
              className="rounded-xl border p-3.5 sm:p-4"
              style={{
                borderColor: theme.colors.outline,
                backgroundColor: theme.colors.sidebarBackground,
              }}
            >
              <div className="min-w-0 text-left">
                <p className="text-[15px] font-bold tabular-nums text-white sm:text-[16px]">{row.id}</p>
                <p className="mt-0.5 text-[13px] font-medium text-white">{row.businessName}</p>
              </div>
              <dl className="mt-3 space-y-2.5 text-left text-[12px] text-white/85 sm:space-y-3 sm:text-[13px]">
                <div>
                  <dt className="text-[11px] text-white/55">Name</dt>
                  <dd className="mt-0.5 font-medium text-white">{row.partnerName}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-white/55">Email</dt>
                  <dd className="mt-0.5 break-all">{row.email}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-white/55">Phone</dt>
                  <dd className="mt-0.5 tabular-nums">{row.phone}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-white/55">Submitted</dt>
                  <dd className="mt-0.5 tabular-nums">{row.submittedAt}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-white/55">Documents</dt>
                  <dd className="mt-0.5 leading-snug text-white/80">{row.documentsSummary}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-white/55">Status</dt>
                  <dd className="mt-0.5">
                    <span
                      className={`${statusPillClass} inline-flex rounded-full py-1 pl-2.5 pr-3 text-[11px] sm:text-xs`}
                      style={{
                        backgroundColor: pill.bg,
                        color: pill.fg,
                        borderColor: pill.border,
                      }}
                    >
                      {row.status}
                    </span>
                  </dd>
                </div>
              </dl>
              <Link
                href={`/partner-kyc/${encodeURIComponent(row.id)}`}
                className="mt-4 w-full min-h-[44px] rounded-xl border px-3 py-2.5 text-[13px] font-semibold"
                style={{ borderColor: theme.colors.filledButtonBorder, color: theme.colors.themeWhite }}
              >
                View partner
              </Link>
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
