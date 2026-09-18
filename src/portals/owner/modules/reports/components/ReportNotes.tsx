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
    <section className="rounded-plate border border-edge bg-board-ground p-4">
      <header className="flex items-center gap-1.5 mb-2">
        <Info size={13} className="text-ink-muted" />
        <h4 className="text-micro uppercase text-ink-muted">How to read this</h4>
      </header>
      <ul className="space-y-1.5">
        {notes.map((note, i) => (
          <li key={i} className="text-label leading-relaxed text-ink-muted flex gap-2">
            <span aria-hidden className="mt-1.5 size-1 shrink-0 rounded-full bg-ink-muted" />
            <span>{note}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};
