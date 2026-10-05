import React, { useMemo, useState } from "react";
import { CalendarDays, Check, ChevronDown } from "lucide-react";
import type { DateRange as DayPickerRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";
import { useDeviceTier } from "../hooks/useDeviceTier";

/**
 * A window of whole days, both ends INCLUSIVE.
 *
 * Inclusive because that is what a person means when they tap 1 and then 30 —
 * "through the thirtieth". The server converts to its exclusive query bound in
 * one place (dateRangeResolver), so no caller has to remember to.
 */
export interface DateRange {
  start: Date;
  end: Date;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** `YYYY-MM-DD` from LOCAL parts — `toISOString()` would shift the day. */
export function toApiDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Mirrors the server's `formatRangeLabel`, so the button and the PDF agree. */
export function formatRangeLabel(range: DateRange): string {
  const { start, end } = range;
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  if (sameDay) return `${MONTHS[start.getMonth()]} ${start.getDate()}, ${start.getFullYear()}`;

  const sameYear = start.getFullYear() === end.getFullYear();
  const from = sameYear
    ? `${MONTHS[start.getMonth()]} ${start.getDate()}`
    : `${MONTHS[start.getMonth()]} ${start.getDate()}, ${start.getFullYear()}`;

  return `${from} – ${MONTHS[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
}

interface Preset {
  label: string;
  build: (today: Date) => DateRange;
}

/**
 * The windows people actually ask for.
 *
 * These carry what the Daily/Weekly/Monthly/Yearly pills used to do, which is
 * why replacing the pills with this control loses nothing: the common cases are
 * still one click, and the uncommon one is now possible at all.
 */
export const RANGE_PRESETS: Preset[] = [
  { label: "Today", build: (t) => ({ start: t, end: t }) },
  { label: "Yesterday", build: (t) => ({ start: addDays(t, -1), end: addDays(t, -1) }) },
  { label: "Last 7 days", build: (t) => ({ start: addDays(t, -6), end: t }) },
  { label: "Last 30 days", build: (t) => ({ start: addDays(t, -29), end: t }) },
  {
    label: "This week",
    build: (t) => {
      // Monday-based, matching the business week the settlement flow runs on
      // (see reportPeriodStrategy). A Sunday-start week here would put a
      // Sunday's takings in a different bucket than the reports do.
      const dow = t.getDay();
      const monday = addDays(t, dow === 0 ? -6 : 1 - dow);
      return { start: monday, end: t };
    },
  },
  {
    label: "This month",
    build: (t) => ({ start: new Date(t.getFullYear(), t.getMonth(), 1), end: t }),
  },
  {
    label: "Last month",
    build: (t) => ({
      start: new Date(t.getFullYear(), t.getMonth() - 1, 1),
      end: new Date(t.getFullYear(), t.getMonth(), 0),
    }),
  },
  { label: "This year", build: (t) => ({ start: new Date(t.getFullYear(), 0, 1), end: t }) },
];

export interface QuarterDefinition {
  id: "Q1" | "Q2" | "Q3" | "Q4";
  label: string;
  sub: string;
  build: (year: number) => DateRange;
}

export const QUARTERS: QuarterDefinition[] = [
  {
    id: "Q1",
    label: "Q1",
    sub: "Jan – Mar",
    build: (year: number) => ({
      start: new Date(year, 0, 1),
      end: new Date(year, 2, 31),
    }),
  },
  {
    id: "Q2",
    label: "Q2",
    sub: "Apr – Jun",
    build: (year: number) => ({
      start: new Date(year, 3, 1),
      end: new Date(year, 5, 30),
    }),
  },
  {
    id: "Q3",
    label: "Q3",
    sub: "Jul – Sep",
    build: (year: number) => ({
      start: new Date(year, 6, 1),
      end: new Date(year, 8, 30),
    }),
  },
  {
    id: "Q4",
    label: "Q4",
    sub: "Oct – Dec",
    build: (year: number) => ({
      start: new Date(year, 9, 1),
      end: new Date(year, 11, 31),
    }),
  },
];

export function findMatchingQuarter(
  range: DateRange | null
): { quarter: "Q1" | "Q2" | "Q3" | "Q4"; year: number; label: string; sub: string } | null {
  if (!range) return null;
  const { start, end } = range;
  const y = start.getFullYear();
  if (end.getFullYear() !== y) return null;

  for (const q of QUARTERS) {
    const candidate = q.build(y);
    if (sameDay(candidate.start, start) && sameDay(candidate.end, end)) {
      return { quarter: q.id, year: y, label: q.label, sub: q.sub };
    }
  }
  return null;
}

interface DateRangePickerProps {
  /**
   * The committed window, or null where another control currently owns the
   * selection — the Dashboard's frequency pills, for instance. Null shows
   * `placeholder` rather than a date, so the button never claims a window that
   * is not actually in force.
   */
  value: DateRange | null;
  onChange: (range: DateRange) => void;
  /** Shown when `value` is null. */
  placeholder?: string;
  /** Days beyond this are not selectable. Defaults to today. */
  maxDate?: Date;
  disabled?: boolean;
  className?: string;
}

/**
 * The calendar behind every dated view.
 *
 * Deliberately does NOT commit a half-made selection. react-day-picker reports a
 * range the moment the first day is clicked, with `to` still undefined; firing
 * onChange there would refetch the whole report against a one-day window and
 * flash a wrong number on screen between the two clicks. The draft lives here
 * until both ends exist.
 */
export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  placeholder = "Custom range",
  maxDate,
  disabled,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DayPickerRange | undefined>();

  const today = useMemo(() => startOfDay(new Date()), []);
  const latest = maxDate ?? today;
  const { isPhone } = useDeviceTier();

  const [quarterYear, setQuarterYear] = useState<number>(() =>
    value ? value.start.getFullYear() : new Date().getFullYear()
  );

  // While the popover is open the calendar shows the draft; otherwise the
  // committed value, so reopening never displays a stale half-selection.
  const shown: DayPickerRange | undefined =
    open && draft ? draft : value ? { from: value.start, to: value.end } : undefined;

  const activeQuarter = useMemo(() => findMatchingQuarter(value), [value]);

  const activePreset = value
    ? RANGE_PRESETS.find((p) => {
        const r = p.build(today);
        return sameDay(r.start, value.start) && sameDay(r.end, value.end);
      })
    : undefined;

  const triggerLabel = value
    ? activeQuarter
      ? `${activeQuarter.quarter} ${activeQuarter.year} (${activeQuarter.sub})`
      : activePreset?.label ?? formatRangeLabel(value)
    : placeholder;
  // A window is in force through THIS control, so the trigger carries the
  // selected styling the way a chosen segmented-control pill does.
  const isActive = value !== null;

  const handleSelect = (range: DayPickerRange | undefined) => {
    setDraft(range);
    if (range?.from && range?.to) {
      onChange({ start: startOfDay(range.from), end: startOfDay(range.to) });
      setDraft(undefined);
      setOpen(false);
    }
  };

  const applyPreset = (preset: Preset) => {
    onChange(preset.build(today));
    setDraft(undefined);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Drop a half-made selection on close rather than carrying it into the
        // next opening, where it would look like a committed choice.
        if (!next) setDraft(undefined);
      }}
    >
      <PopoverTrigger
        disabled={disabled}
        // `cn` (tailwind-merge), never a plain join: a caller's `bg-*`/`text-*`
        // has to REPLACE the defaults below. Concatenating leaves both classes
        // on the element and lets stylesheet order pick the winner, which is how
        // the active state ended up as white text on a light slate background.
        className={cn(
          "inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold transition",
          "border-slate-200 bg-white text-slate-700 shadow-xs",
          "hover:bg-slate-50 hover:text-slate-900",
          isActive && "border-[#1E3A5F] bg-[#1E3A5F] text-white hover:bg-[#162D4A] hover:text-white",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
        aria-label="Select a date range"
      >
        <CalendarDays size={14} className={cn("shrink-0", isActive ? "text-white/80" : "text-slate-400")} />
        <span className="whitespace-nowrap">{triggerLabel}</span>
        <ChevronDown size={12} className={cn("shrink-0", isActive ? "text-white/70" : "text-slate-400")} />
      </PopoverTrigger>

      <PopoverContent className="p-0 overflow-hidden w-auto max-w-[95vw]">
        <div className="flex flex-col sm:flex-row">
          <div className="sm:w-44 shrink-0 border-b sm:border-b-0 sm:border-r border-slate-100 p-2 flex flex-col justify-between">
            <div>
              <p className="px-2 pt-1 pb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Quick ranges
              </p>
              <div className="flex sm:flex-col gap-0.5 overflow-x-auto sm:overflow-visible">
                {RANGE_PRESETS.map((preset) => {
                  const isPresetActive = !activeQuarter && activePreset?.label === preset.label;
                  return (
                    <button
                      key={preset.label}
                      onClick={() => applyPreset(preset)}
                      className={`flex items-center justify-between gap-2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition ${
                        isPresetActive
                          ? "bg-[#1E3A5F] text-white"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      {preset.label}
                      {isPresetActive && <Check size={12} className="shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quarterly (Q1, Q2, Q3, Q4) Selector */}
            <div className="pt-2.5 mt-2 border-t border-slate-100">
              <div className="flex items-center justify-between px-2 pb-1.5">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Quarterly
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setQuarterYear((y) => y - 1)}
                    className="size-5 rounded hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 text-xs font-bold transition cursor-pointer"
                    title="Previous year"
                    aria-label="Previous year"
                  >
                    ‹
                  </button>
                  <span className="text-xs font-bold text-slate-700 font-mono">{quarterYear}</span>
                  <button
                    type="button"
                    onClick={() => setQuarterYear((y) => y + 1)}
                    className="size-5 rounded hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 text-xs font-bold transition cursor-pointer"
                    title="Next year"
                    aria-label="Next year"
                  >
                    ›
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1 px-0.5">
                {QUARTERS.map((q) => {
                  const qRange = q.build(quarterYear);
                  const isQuarterActive =
                    value &&
                    sameDay(value.start, qRange.start) &&
                    sameDay(value.end, qRange.end);
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        onChange(qRange);
                        setDraft(undefined);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex flex-col items-start px-2 py-1 rounded-lg text-left transition border cursor-pointer",
                        isQuarterActive
                          ? "bg-[#1E3A5F] text-white border-[#1E3A5F]"
                          : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200/70"
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold">{q.label}</span>
                        {isQuarterActive && <Check size={11} className="shrink-0 text-white" />}
                      </div>
                      <span
                        className={cn(
                          "text-[9px] leading-tight",
                          isQuarterActive ? "text-white/80" : "text-slate-400"
                        )}
                      >
                        {q.sub}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <Calendar
              mode="range"
              numberOfMonths={isPhone ? 1 : 2}
              defaultMonth={value?.start ?? today}
              selected={shown}
              onSelect={handleSelect}
              disabled={{ after: latest }}
            />
            <div className="border-t border-slate-100 px-4 py-2.5">
              <p className="text-[11px] font-semibold text-slate-500">
                {draft?.from && !draft?.to
                  ? "Now pick the end of the range"
                  : value
                    ? formatRangeLabel(value)
                    : "Pick a start and an end date"}
              </p>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

/** The window a dated view opens on: the current month, to date. */
export function defaultRange(): DateRange {
  const today = startOfDay(new Date());
  return { start: new Date(today.getFullYear(), today.getMonth(), 1), end: today };
}
