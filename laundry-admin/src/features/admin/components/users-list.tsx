"use client";

import { PRODUCT_NAME } from "@/lib/branding";
import { theme } from "@/lib/theme/theme";
import type { AdminUser } from "@/features/admin/data/users-demo-data";
import { useEffect, useMemo, useState } from "react";

type UsersListProps = {
  users: AdminUser[];
};

type StatusFilter = "all" | AdminUser["status"];

const statusPillMap: Record<AdminUser["status"], { bg: string; fg: string; border: string }> = {
  Active: { bg: "rgba(110, 231, 168, 0.2)", fg: "#6EE7A8", border: "rgba(110, 231, 168, 0.45)" },
  Pending: { bg: "rgba(246, 211, 107, 0.2)", fg: "#F6D36B", border: "rgba(246, 211, 107, 0.45)" },
  Blocked: { bg: "rgba(241, 140, 140, 0.22)", fg: "#F18C8C", border: "rgba(241, 140, 140, 0.45)" },
};

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "Active", label: "Active" },
  { key: "Pending", label: "Pending" },
  { key: "Blocked", label: "Blocked" },
];

const statusPillClass = "admin-status-pill border text-[11px] font-semibold sm:text-xs";

const tableGridClass =
  "grid grid-cols-[minmax(128px,1.1fr)_minmax(200px,1.55fr)_minmax(136px,1fr)_minmax(132px,1fr)_80px_minmax(96px,0.9fr)] items-center gap-x-3 gap-y-1 sm:gap-x-4";

const PAGE_SIZE = 10;

export function UsersList({ users }: UsersListProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);

  const filteredUsers = useMemo(() => {
    if (statusFilter === "all") return users;
    return users.filter((user) => user.status === statusFilter);
  }, [users, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const pagedUsers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, page]);

  const total = filteredUsers.length;
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
        <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold text-white">
          Users
        </h1>
        <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-white/75 sm:text-[15px]">
          Customers and partners on {PRODUCT_NAME}: Super Admin can view accounts and status only.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-start gap-2 sm:gap-2.5">
        {FILTERS.map(({ key, label }) => {
          const isSelected = statusFilter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              className="inline-flex min-h-[40px] min-w-[72px] flex-1 items-center justify-center rounded-full border px-3 py-2 text-center text-[12px] font-semibold transition active:opacity-90 sm:min-h-[40px] sm:min-w-0 sm:flex-none sm:px-4 sm:py-2.5 sm:text-[13px]"
              style={{
                borderColor: theme.colors.filledButtonBorder,
                backgroundColor: isSelected ? theme.colors.secondary : "transparent",
                color: theme.colors.themeWhite,
                ...(isSelected
                  ? {}
                  : { boxShadow: "inset 0 0 0 1px rgba(160, 208, 233, 0.25)" }),
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Tablet/desktop: horizontal scroll so columns never crush */}
      <div
        className="scrollbar-hidden hidden min-w-0 overflow-x-auto rounded-xl border md:block [-webkit-overflow-scrolling:touch]"
        style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}
      >
        <div className="min-w-[920px]">
          <div
            className={`sticky top-0 z-[1] ${tableGridClass} border-b px-3 py-3 text-xs font-bold text-white/90 sm:px-4 sm:text-sm`}
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              backgroundColor: theme.colors.sidebarBackground,
            }}
          >
            <span className="text-left">Name</span>
            <span className="text-left">Email</span>
            <span className="text-left">Phone</span>
            <span className="text-left">Status</span>
            <span className="text-center">Orders</span>
            <span className="text-right">Joined</span>
          </div>
          {pagedUsers.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-white/60">
              No users match the selected filter.
            </div>
          ) : null}
          {pagedUsers.map((user) => (
            <div
              key={user.id}
              className={`${tableGridClass} border-b px-3 py-2.5 text-xs text-white/85 last:border-b-0 sm:px-4 sm:py-3 sm:text-sm`}
              style={{ borderColor: "rgba(255,255,255,0.12)" }}
            >
              <span className="font-semibold leading-snug">{user.name}</span>
              <span className="min-w-0 truncate text-left" title={user.email}>
                {user.email}
              </span>
              <span className="whitespace-nowrap text-left tabular-nums">{user.phone}</span>
              <div className="flex w-full min-w-[120px] max-w-[160px] items-center justify-start">
                <span
                  className={`${statusPillClass} inline-flex rounded-full py-1 pl-2.5 pr-3`}
                  style={{
                    backgroundColor: statusPillMap[user.status].bg,
                    color: statusPillMap[user.status].fg,
                    borderColor: statusPillMap[user.status].border,
                  }}
                >
                  {user.status}
                </span>
              </div>
              <span className="block text-center tabular-nums leading-none">{user.orders}</span>
              <span className="whitespace-nowrap text-right tabular-nums leading-none">
                {user.joinedAt}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: stacked cards */}
      <div className="grid gap-3 md:hidden">
        {pagedUsers.length === 0 ? (
          <p className="rounded-xl border px-4 py-8 text-center text-sm text-white/60" style={{ borderColor: theme.colors.outline }}>
            No users match the selected filter.
          </p>
        ) : null}
        {pagedUsers.map((user) => (
          <article
            key={user.id}
            className="rounded-xl border p-3.5 sm:p-4"
            style={{
              borderColor: theme.colors.outline,
              backgroundColor: theme.colors.sidebarBackground,
            }}
          >
            <div className="min-w-0">
              <p className="text-[15px] font-bold leading-snug text-white sm:text-[16px]">{user.name}</p>
              <p className="mt-1 break-words text-[12px] leading-relaxed text-white/75 sm:text-[13px]">
                {user.email}
              </p>
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-white/55 sm:w-20 sm:text-[12px]">
                Status
              </span>
              <span
                className={`${statusPillClass} inline-flex w-fit rounded-full py-1.5 pl-3 pr-3.5`}
                style={{
                  backgroundColor: statusPillMap[user.status].bg,
                  color: statusPillMap[user.status].fg,
                  borderColor: statusPillMap[user.status].border,
                }}
              >
                {user.status}
              </span>
            </div>

            <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-3 text-[12px] text-white/85 sm:grid-cols-2 sm:text-[13px]">
              <div className="flex flex-col gap-1 sm:col-span-2">
                <dt className="text-[11px] font-medium text-white/55">Phone</dt>
                <dd className="break-all leading-snug">{user.phone}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-[11px] font-medium text-white/55">Orders</dt>
                <dd className="tabular-nums leading-none">{user.orders}</dd>
              </div>
              <div className="flex flex-col gap-1 sm:text-right">
                <dt className="text-[11px] font-medium text-white/55 sm:text-right">Joined</dt>
                <dd className="tabular-nums leading-none sm:text-right">{user.joinedAt}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] text-white/65 sm:text-sm">
          Showing{" "}
          <span className="font-semibold text-white/85">
            {rangeStart} to {rangeEnd}
          </span>{" "}
          of <span className="font-semibold text-white/85">{total}</span> users
          {statusFilter !== "all" ? (
            <span className="text-white/50">
              {" "}
              (filtered from {users.length} total)
            </span>
          ) : null}
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
