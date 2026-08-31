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

export const HeaderClock: React.FC = () => {
  const [timeStr, setTimeStr] = useState<string>(() => formatDateTime(new Date()));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeStr(formatDateTime(new Date()));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700 text-xs font-semibold select-none shadow-2xs"
      title="Current System Time"
    >
      <Clock size={14} className="text-slate-500 shrink-0" />
      <span className="tabular-nums tracking-tight">{timeStr}</span>
    </div>
  );
};