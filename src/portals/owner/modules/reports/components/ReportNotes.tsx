import React from "react";
import { Info } from "lucide-react";

/**
 * The caveats and denominators a report ships with.
 *
 * Not decoration. "On-time 75%" and "on-time 75%, over the 4 of 22 errands that
 * carried an ETA" support different decisions, and only one of them is honest
 * about what it rests on. The server composes these alongside the figures so the
 * screen and the PDF carry identical wording.
 */
export const ReportNotes: React.FC<{ notes?: string[] }> = ({ notes }) => {
  if (!notes || notes.length === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <header className="flex items-center gap-1.5 mb-2">
        <Info size={13} className="text-slate-400" />
        <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
          How to read this
        </h4>
      </header>
      <ul className="space-y-1.5">
        {notes.map((note, i) => (
          <li key={i} className="text-[11px] leading-relaxed text-slate-600 flex gap-2">
            <span className="text-slate-300 shrink-0">—</span>
            <span>{note}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};
