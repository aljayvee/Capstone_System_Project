import React, { useEffect, useState } from "react";
import { Clock } from "lucide-react";

function formatDateTime(date: Date): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayName = days[date.getDay()];
  const monthName = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;

  return `${dayName}, ${monthName} ${day}, ${year} - ${hours}:${minutes}${ampm}`;
}

/** Local time as an ISO-ish value for the <time> element's machine reading. */
function machineValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/**
 * The shift clock. Rendered in both the Owner and Dispatcher headers.
 *
 * It used to re-render on a 1000ms interval against a string with minute
 * precision, so 59 of every 60 renders produced a byte-identical result and
 * threw it away. It now sleeps to the next minute boundary and ticks once a
 * minute after that, which is both 60x less work and more accurate: a fixed
 * 60s interval started at :47 would have flipped the displayed minute 13
 * seconds late, forever.
 *
 * `data-clock` carries no styling of its own. It is the hook surfaces.css uses
 * to invert this pill when it sits on the navy board band, where a slate-50
 * chip read as a foreign object; the Owner portal sees no change.
 */
export const HeaderClock: React.FC = () => {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    // Land on the boundary first, then settle into a once-a-minute rhythm.
    const msToNextMinute = 60_000 - (Date.now() % 60_000);
    const align = setTimeout(() => {
      setNow(new Date());
      interval = setInterval(() => setNow(new Date()), 60_000);
    }, msToNextMinute);

    return () => {
      clearTimeout(align);
      if (interval) clearInterval(interval);
    };
  }, []);

  return (
    <div
      data-clock
      className="flex select-none items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 sm:gap-2 sm:px-3"
    >
      <Clock size={14} className="shrink-0 opacity-70" />
      <time data-figure dateTime={machineValue(now)} className="tabular-nums tracking-tight">
        {formatDateTime(now)}
      </time>
    </div>
  );
};
