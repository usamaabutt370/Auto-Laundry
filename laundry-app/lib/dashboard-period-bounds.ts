import type { DashboardPeriod } from "@/components/dashboard-period-selector";

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfWeekMonday(date: Date): Date {
  const next = startOfDay(date);
  const day = next.getDay();
  const offset = (day + 6) % 7;
  next.setDate(next.getDate() - offset);
  return next;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

/** Calendar week (Mon 00:00) through following Mon 00:00 exclusive, current month, or current year. */
export function getPeriodCalendarBounds(
  period: DashboardPeriod,
  now: Date,
): { start: Date; endExclusive: Date } {
  if (period === "week") {
    const start = startOfWeekMonday(now);
    return { start, endExclusive: addDays(start, 7) };
  }
  if (period === "month") {
    const start = startOfMonth(now);
    return { start, endExclusive: addMonths(start, 1) };
  }
  const start = new Date(now.getFullYear(), 0, 1);
  return { start, endExclusive: new Date(now.getFullYear() + 1, 0, 1) };
}

/** Human-readable bounds for the selected calendar period (matches hook filtering). */
export function formatDashboardPeriodRange(
  period: DashboardPeriod,
  now: Date,
  locale: string,
): string {
  const { start, endExclusive } = getPeriodCalendarBounds(period, now);
  const endInclusive = new Date(endExclusive.getTime() - 1);

  if (period === "year") {
    return new Intl.DateTimeFormat(locale, { year: "numeric" }).format(start);
  }
  if (period === "month") {
    return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(start);
  }

  const df = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${df.format(start)} – ${df.format(endInclusive)}`;
}
