export type PartnerOpenStatus = "open" | "closed" | "unknown";

/** Minutes from midnight, 0–1439. */
function parseClockToMinutes(raw: string): number | null {
  const value = raw.trim().toUpperCase().replace(/\s+/g, " ");
  const match = value.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  const period = match[3];
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || minute > 59) return null;
  if (period) {
    if (hour < 1 || hour > 12) return null;
    hour = hour % 12;
    if (period === "PM") hour += 12;
  } else if (hour > 23) {
    return null;
  }
  return hour * 60 + minute;
}

function parseAvailableTimeRange(
  availableTime: string | null | undefined,
): { start: number; end: number } | null {
  const raw = availableTime?.trim();
  if (!raw) return null;
  const parts = raw.split(/\s*[-–—]\s*/);
  if (parts.length !== 2) return null;
  const start = parseClockToMinutes(parts[0]);
  const end = parseClockToMinutes(parts[1]);
  if (start == null || end == null) return null;
  return { start, end };
}

function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function isWithinHours(start: number, end: number, nowMinutes: number): boolean {
  if (start === end) return true;
  if (start < end) return nowMinutes >= start && nowMinutes < end;
  return nowMinutes >= start || nowMinutes < end;
}

export function getPartnerOpenStatus(
  availableTime: string | null | undefined,
  now: Date = new Date(),
): PartnerOpenStatus {
  const range = parseAvailableTimeRange(availableTime);
  if (!range) return "unknown";
  return isWithinHours(range.start, range.end, minutesOfDay(now)) ? "open" : "closed";
}

export function isPartnerOpenNow(
  availableTime: string | null | undefined,
  now: Date = new Date(),
): boolean {
  return getPartnerOpenStatus(availableTime, now) === "open";
}
