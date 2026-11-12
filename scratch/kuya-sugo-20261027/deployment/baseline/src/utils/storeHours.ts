/**
 * A Location Store's weekly hours, as the server keeps them
 * (server lib/places/storeHours.ts): one entry per day, day 0 = Sunday, times
 * "HH:MM" in Philippine time. A close at or before the open runs past
 * midnight; "00:00" to "24:00" is open all day.
 */

export interface DayHours {
  day: number;
  closed: boolean;
  open: string;
  close: string;
}

export interface WeeklyHours {
  days: DayHours[];
}

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Monday first, as a shop's door sign reads. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const OPEN_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
export const CLOSE_TIME = /^(([01]\d|2[0-3]):[0-5]\d|24:00)$/;

/** A week to start the editor from: every day 7:00 AM to 9:00 PM. */
export function defaultWeek(): WeeklyHours {
  return { days: DAY_NAMES.map((_, day) => ({ day, closed: false, open: "07:00", close: "21:00" })) };
}

/** The stored value, if it is a full week; otherwise null (no schedule). */
export function readWeek(raw: unknown): WeeklyHours | null {
  const days = (raw as WeeklyHours | null)?.days;
  if (!Array.isArray(days) || days.length !== 7) return null;
  return { days: [...days].sort((a, b) => a.day - b.day) };
}

export const isAllDay = (d: DayHours) => !d.closed && d.open === "00:00" && d.close === "24:00";

/** "7:00 AM". */
export function time12(hhmm: string): string {
  if (hhmm === "24:00") return "12:00 AM";
  const [h, m] = hhmm.split(":").map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

export function describeDay(d: DayHours): string {
  if (d.closed) return "Closed";
  if (isAllDay(d)) return "Open 24 hours";
  return `${time12(d.open)} to ${time12(d.close)}`;
}

/** Every open day valid; the first problem found, or null. */
export function weekProblem(week: WeeklyHours): string | null {
  for (const d of week.days) {
    if (d.closed) continue;
    if (!OPEN_TIME.test(d.open) || !CLOSE_TIME.test(d.close)) {
      return `${DAY_NAMES[d.day]} needs an opening and a closing time.`;
    }
    if (d.open === d.close) return `${DAY_NAMES[d.day]} opens and closes at the same time. Use "24 hours" instead.`;
  }
  return null;
}

/**
 * One line for the table: "Daily, 7:00 AM to 9:00 PM", "7:00 AM to 9:00 PM,
 * closed Sun", or "Varies by day".
 */
export function summarizeWeek(week: WeeklyHours | null): string {
  if (!week) return "No hours set";
  const open = week.days.filter((d) => !d.closed);
  if (open.length === 0) return "Closed every day";
  const first = describeDay(open[0]);
  if (open.some((d) => describeDay(d) !== first)) return "Varies by day";
  const closed = WEEK_ORDER.filter((day) => week.days[day]?.closed).map((day) => DAY_SHORT[day]);
  return closed.length === 0 ? `Daily, ${first}` : `${first}, closed ${closed.join(", ")}`;
}

/** Same week, same hours. */
export function sameWeek(a: WeeklyHours | null, b: WeeklyHours | null): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
