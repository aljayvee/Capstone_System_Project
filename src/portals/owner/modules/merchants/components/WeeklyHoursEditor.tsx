import { Clock, Copy, X } from "lucide-react";
import {
  DAY_NAMES,
  WEEK_ORDER,
  defaultWeek,
  isAllDay,
  type DayHours,
  type WeeklyHours,
} from "../../../../../utils/storeHours";

interface WeeklyHoursEditorProps {
  /** Null: no schedule, so the apps estimate open or closed from the kind of shop. */
  value: WeeklyHours | null;
  onChange: (next: WeeklyHours | null) => void;
  /** Where the hours came from, shown under the title ("From Google Maps"). */
  sourceNote?: string | null;
}

const fieldClass =
  "w-full rounded-plate border border-edge bg-board-ground px-2 py-1.5 text-label font-mono text-ink focus:bg-board-plate focus:outline-none focus:ring-2 focus:ring-board-field disabled:opacity-40";

/**
 * The store's opening and closing time for each day of the week (2026-10-13).
 * The customer app shows a store as open or closed by these, and tells the
 * customer when a closed store opens next.
 */
export function WeeklyHoursEditor({ value, onChange, sourceNote }: WeeklyHoursEditorProps) {
  if (!value) {
    return (
      <div className="rounded-plate border border-dashed border-edge bg-board-ground p-3">
        <p className="m-0 flex items-center gap-1.5 text-label text-ink">
          <Clock size={14} className="text-ink-muted" />
          No opening hours set
        </p>
        <p className="m-0 mt-1 text-label text-ink-muted">
          Customers see the store as open or closed by an estimate from its kind of shop.
        </p>
        <button
          type="button"
          onClick={() => onChange(defaultWeek())}
          className="mt-2 inline-flex min-h-8 items-center gap-1.5 rounded-plate border border-edge bg-board-plate px-3 text-label text-ink transition-colors hover:bg-board-ground"
        >
          Set opening hours
        </button>
      </div>
    );
  }

  const setDay = (day: number, patch: Partial<DayHours>) =>
    onChange({ days: value.days.map((d) => (d.day === day ? { ...d, ...patch } : d)) });

  const copyMondayToAll = () => {
    const monday = value.days.find((d) => d.day === 1)!;
    onChange({ days: value.days.map((d) => ({ ...monday, day: d.day })) });
  };

  return (
    <div className="rounded-plate border border-edge bg-board-ground">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-hairline px-3 py-2">
        <p className="m-0 text-label font-medium text-ink">Opening hours</p>
        {sourceNote ? <p className="order-last m-0 w-full text-micro text-ink-muted">{sourceNote}</p> : null}
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={copyMondayToAll}
            title="Give every day Monday's hours"
            className="inline-flex min-h-8 items-center gap-1 rounded-plate px-2 text-label text-ink-muted transition-colors hover:bg-board-plate hover:text-ink"
          >
            <Copy size={13} />
            <span>Same as Monday</span>
          </button>
          <button
            type="button"
            onClick={() => onChange(null)}
            title="Remove the schedule"
            className="inline-flex min-h-8 items-center gap-1 rounded-plate px-2 text-label text-ink-muted transition-colors hover:bg-board-plate hover:text-ink"
          >
            <X size={13} />
            <span>Clear</span>
          </button>
        </div>
      </div>
      <div className="divide-y divide-hairline">
        {WEEK_ORDER.map((dayIndex) => {
          const d = value.days.find((x) => x.day === dayIndex)!;
          const allDay = isAllDay(d);
          return (
            <div key={dayIndex} className="grid grid-cols-[5.5rem_1fr] items-center gap-2 px-3 py-1.5">
              <label className="flex items-center gap-2 text-label text-ink">
                <input
                  type="checkbox"
                  checked={!d.closed}
                  onChange={(e) =>
                    setDay(dayIndex, e.target.checked ? { closed: false, open: d.open || "07:00", close: d.close || "21:00" } : { closed: true })
                  }
                  aria-label={`Open on ${DAY_NAMES[dayIndex]}`}
                />
                <span>{DAY_NAMES[dayIndex].slice(0, 3)}</span>
              </label>
              {d.closed ? (
                <span className="text-label text-ink-muted">Closed</span>
              ) : (
                <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-1.5">
                  <input
                    type="time"
                    value={allDay ? "00:00" : d.open}
                    disabled={allDay}
                    onChange={(e) => setDay(dayIndex, { open: e.target.value })}
                    aria-label={`${DAY_NAMES[dayIndex]} opening time`}
                    className={fieldClass}
                  />
                  <input
                    type="time"
                    value={allDay ? "00:00" : d.close === "24:00" ? "00:00" : d.close}
                    disabled={allDay}
                    onChange={(e) => setDay(dayIndex, { close: e.target.value })}
                    aria-label={`${DAY_NAMES[dayIndex]} closing time`}
                    className={fieldClass}
                  />
                  <label className="flex items-center gap-1 whitespace-nowrap text-micro uppercase text-ink-muted">
                    <input
                      type="checkbox"
                      checked={allDay}
                      onChange={(e) =>
                        setDay(dayIndex, e.target.checked ? { open: "00:00", close: "24:00" } : { open: "07:00", close: "21:00" })
                      }
                    />
                    24 h
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
