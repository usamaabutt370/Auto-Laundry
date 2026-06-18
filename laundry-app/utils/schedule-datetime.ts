export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export const MONTH_NAMES_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** 8am–8pm, 1hr slots: "8am - 9am", ... "7pm - 8pm" */
export function buildTimeSlots(): string[] {
  const slots: string[] = [];
  const format = (h: number) => {
    if (h === 0) return "12am";
    if (h === 12) return "12pm";
    return h < 12 ? `${h}am` : `${h - 12}pm`;
  };
  for (let start = 8; start < 20; start++) {
    const end = start + 1;
    slots.push(`${format(start)} - ${format(end)}`);
  }
  return slots;
}

export const TIME_SLOTS = buildTimeSlots();

export function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function isBeforeDate(left: Date, right: Date): boolean {
  return startOfDay(left).getTime() < startOfDay(right).getTime();
}

export function isSameDay(left: Date, right: Date): boolean {
  return startOfDay(left).getTime() === startOfDay(right).getTime();
}

export function dateToIso(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function parseIsoDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const parsed = new Date(year, month, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

export function getDatesForMonth(
  year: number,
  month: number,
): { date: Date; dayLabel: string; dayNum: string; isToday: boolean }[] {
  const out: {
    date: Date;
    dayLabel: string;
    dayNum: string;
    isToday: boolean;
  }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const isToday =
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate();
    out.push({
      date: d,
      dayLabel: DAY_LABELS[d.getDay()],
      dayNum: String(day),
      isToday,
    });
  }
  return out;
}

export function formatTodayString(): string {
  const d = new Date();
  return `${DAY_LABELS[d.getDay()]} ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

/** "Today" | "Tomorrow" | "Wed, Apr 14" */
export function getDayLabel(
  selectedDate: Date,
  today: Date,
  todayStr: string,
  tomorrowStr: string,
): string {
  const s = startOfDay(selectedDate);
  const t = startOfDay(today);
  const diffDays = Math.round((s.getTime() - t.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return todayStr;
  if (diffDays === 1) return tomorrowStr;
  return `${DAY_LABELS[selectedDate.getDay()]}, ${MONTHS_SHORT[selectedDate.getMonth()]} ${selectedDate.getDate()}`;
}

export function timeSlotIndexFromLabel(label: string | null | undefined): number {
  if (!label) return 3;
  const index = TIME_SLOTS.indexOf(label);
  return index >= 0 ? index : 3;
}
