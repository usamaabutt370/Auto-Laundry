"use client";

import type { PaginatedResult } from "@/features/admin/server/admin-list-query";
import { theme } from "@/lib/theme/theme";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";

type AdminDesktopTableProps = {
  minWidthClassName: string;
  children: ReactNode;
};

export function AdminDesktopTable({ minWidthClassName, children }: AdminDesktopTableProps) {
  return (
    <div
      className="scrollbar-hidden hidden min-w-0 overflow-x-auto rounded-xl border md:block [-webkit-overflow-scrolling:touch]"
      style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}
    >
      <div className={minWidthClassName}>{children}</div>
    </div>
  );
}

export function useAdminListUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const push = useCallback(
    (patch: Record<string, string | null | undefined>, resetPage = false) => {
      const params = new URLSearchParams(searchParams.toString());
      if (resetPage) params.delete("page");
      for (const [key, value] of Object.entries(patch)) {
        if (!value) params.delete(key);
        else params.set(key, value);
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const setPage = useCallback((page: number) => push({ page: String(page) }), [push]);

  return { searchParams, push, setPage };
}

export function useDebouncedListSearch() {
  const { searchParams, push } = useAdminListUrl();
  const query = searchParams.get("q") ?? "";
  const [draft, setDraft] = useState(query);

  useEffect(() => {
    setDraft(query);
  }, [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (draft === query) return;
      push({ q: draft || null }, true);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [draft, query, push]);

  return { query: draft, setQuery: setDraft };
}

export function adminPaginationView(data: PaginatedResult<unknown>) {
  const pageCount = Math.max(1, Math.ceil(data.total / data.pageSize));
  const rangeStart = data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  const rangeEnd = Math.min(data.page * data.pageSize, data.total);
  const pageNumbers = buildAdminPageNumbers(data.page, pageCount);
  return { pageCount, rangeStart, rangeEnd, pageNumbers };
}

export function buildAdminPageNumbers(page: number, pageCount: number): number[] {
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
}

type AdminListPaginationProps = {
  page: number;
  pageCount: number;
  total: number;
  rangeStart: number;
  rangeEnd: number;
  onPageChange: (value: number) => void;
  pageNumbers: number[];
  noun?: string;
};

export function AdminListPagination({
  page,
  pageCount,
  total,
  rangeStart,
  rangeEnd,
  onPageChange,
  pageNumbers,
  noun = "results",
}: AdminListPaginationProps) {
  return (
    <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[12px] text-white/65 sm:text-sm">
        Showing <span className="font-semibold text-white/85">{rangeStart} to {rangeEnd}</span> of{" "}
        <span className="font-semibold text-white/85">{total}</span> {noun}
      </p>
      {total > 0 ? (
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
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
                onClick={() => onPageChange(n)}
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
            onClick={() => onPageChange(Math.min(pageCount, page + 1))}
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
  );
}
