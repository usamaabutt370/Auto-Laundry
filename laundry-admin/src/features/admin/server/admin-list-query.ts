export const DEFAULT_ADMIN_PAGE_SIZE = 10;
export const MAX_ADMIN_PAGE_SIZE = 50;

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminListQuery = {
  page: number;
  pageSize: number;
  query: string;
  status: string;
  category?: string;
};

export function parseAdminListQuery(searchParams: URLSearchParams): AdminListQuery {
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    MAX_ADMIN_PAGE_SIZE,
    Math.max(1, Number.parseInt(searchParams.get("pageSize") ?? String(DEFAULT_ADMIN_PAGE_SIZE), 10) || DEFAULT_ADMIN_PAGE_SIZE),
  );
  const query = (searchParams.get("q") ?? searchParams.get("query") ?? "").trim();
  const status = (searchParams.get("status") ?? "all").trim() || "all";
  const category = (searchParams.get("category") ?? "all").trim() || "all";
  return { page, pageSize, query, status, category };
}

export function parsePageSearchParams(
  input: Record<string, string | string[] | undefined>,
): AdminListQuery {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string") params.set(key, value);
    else if (Array.isArray(value) && value[0]) params.set(key, value[0]);
  }
  return parseAdminListQuery(params);
}

export function paginatedRange(page: number, pageSize: number): { from: number; to: number } {
  const safePage = Math.max(1, page);
  const safeSize = Math.max(1, pageSize);
  const from = (safePage - 1) * safeSize;
  return { from, to: from + safeSize - 1 };
}

/** Escape `%` and `_` for PostgREST ilike patterns. */
export function escapeIlike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}
