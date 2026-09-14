import React from "react";

import { cn } from "@/lib/utils";
import { DateRangePicker, type DateRange } from "./DateRangePicker";
import type { ApiDateRange, ReportPeriod } from "../services/apiService";

/**
 * The four windows people ask for most, named the way the Dashboard has always
 * named them. Deliberately the same vocabulary on both surfaces: "Month" on one
 * page and "Monthly" on another describes one thing in two ways.
 */
export type RangePreset = "TODAY" | "WEEK" | "MONTH" | "YEAR";

export const PRESET_OPTIONS: Array<{ label: string; value: RangePreset }> = [
  { label: "Today", value: "TODAY" },
  { label: "Week", value: "WEEK" },
  { label: "Month", value: "MONTH" },
  { label: "Year", value: "YEAR" },
];

const PRESET_TO_PERIOD: Record<RangePreset, ReportPeriod> = {
  TODAY: "DAILY",
  WEEK: "WEEKLY",
  MONTH: "MONTHLY",
  YEAR: "YEARLY",
};

/**
 * What to send the API for the current selection.
 *
 * A drawn range wins over the preset, matching the precedence the server applies
 * — the two must not disagree, or the page would show one window and the PDF
 * another.
 */
export function toApiRange(preset: RangePreset, range: DateRange | null): ApiDateRange {
  if (range) {
    const pad = (n: number) => String(n).padStart(2, "0");
    const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return { start: iso(range.start), end: iso(range.end) };
  }
  return { period: PRESET_TO_PERIOD[preset] };
}

interface RangeSelectorProps {
  preset: RangePreset;
  onPresetChange: (preset: RangePreset) => void;
  /** A hand-drawn window, or null while a preset is in force. */
  range: DateRange | null;
  onRangeChange: (range: DateRange | null) => void;
  className?: string;
}

/**
 * Period presets and a calendar, as one control.
 *
 * Shared by the Dashboard and every report so the two cannot drift — the same
 * pills, the same calendar, the same rule about which one is in force.
 *
 * Exactly one of the two is ever active. Choosing a pill clears the range and
 * drawing a range clears the pill, because a highlighted "Month" sitting beside
 * figures that came from an arbitrary range is a page that lies about what it is
 * showing.
 */
export const RangeSelector: React.FC<RangeSelectorProps> = ({
  preset,
  onPresetChange,
  range,
  onRangeChange,
  className,
}) => {
  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60">
        {PRESET_OPTIONS.map((option) => {
          const isActive = !range && preset === option.value;
          return (
            <button
              key={option.value}
              onClick={() => {
                onPresetChange(option.value);
                onRangeChange(null);
              }}
              className={cn(
                "px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition",
                isActive
                  ? "bg-[#1E3A5F] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <DateRangePicker value={range} onChange={onRangeChange} placeholder="Custom range" />
    </div>
  );
};
