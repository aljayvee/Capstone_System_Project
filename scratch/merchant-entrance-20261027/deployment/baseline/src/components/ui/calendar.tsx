"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import "react-day-picker/dist/style.css"

import { cn } from "@/lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

/**
 * The month grid, styled to the portal rather than to react-day-picker.
 *
 * Every class is overridden explicitly instead of leaning on the library's
 * stylesheet: the default theme is blue-on-white with its own type scale, which
 * next to the slate/#1E3A5F portal reads as a widget borrowed from another app.
 * The import of the base stylesheet stays because it carries the layout
 * primitives (grid, hidden-day handling) that are tedious to restate.
 */
function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-5",
        month: "space-y-3",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-xs font-extrabold text-slate-800",
        nav: "flex items-center gap-1",
        nav_button:
          "h-7 w-7 inline-flex items-center justify-center rounded-lg border border-slate-200 " +
          "bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition " +
          "disabled:opacity-40 disabled:pointer-events-none",
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell: "text-slate-400 rounded-md w-9 font-bold text-[10px] uppercase tracking-wide",
        row: "flex w-full mt-1",
        // The range middle needs a square cell so the connecting band is
        // continuous; rounding is applied to the endpoints only, below.
        cell:
          "relative p-0 text-center text-xs focus-within:relative focus-within:z-20 " +
          "[&:has([aria-selected])]:bg-slate-100 " +
          "[&:has([aria-selected].day-range-start)]:rounded-l-lg " +
          "[&:has([aria-selected].day-range-end)]:rounded-r-lg",
        day: "h-9 w-9 p-0 font-medium rounded-lg text-slate-700 hover:bg-slate-200/70 transition aria-selected:opacity-100",
        day_range_start: "day-range-start bg-[#1E3A5F] text-white hover:bg-[#1E3A5F]",
        day_range_end: "day-range-end bg-[#1E3A5F] text-white hover:bg-[#1E3A5F]",
        day_selected: "bg-[#1E3A5F] text-white hover:bg-[#1E3A5F] focus:bg-[#1E3A5F]",
        day_today: "font-extrabold text-[#1E3A5F] underline underline-offset-4",
        day_outside: "text-slate-300",
        day_disabled: "text-slate-300 opacity-50 cursor-not-allowed",
        day_range_middle: "rounded-none bg-transparent text-slate-800 hover:bg-slate-200/70",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft size={14} />,
        IconRight: () => <ChevronRight size={14} />,
      }}
      {...props}
    />
  )
}

export { Calendar }
