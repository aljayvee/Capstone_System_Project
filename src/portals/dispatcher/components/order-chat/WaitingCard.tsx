import * as React from "react";
import { Hourglass } from "lucide-react";

/**
 * What we're waiting for, how long it's been, and what to do meanwhile.
 *
 * Replaces the grey "Pending" pill, which told a dispatcher nothing: not what
 * had been sent, not how long ago, and not what they could usefully do instead
 * of watching it.
 */
interface WaitingCardProps {
  title: string;
  detail: string;
  actions?: Array<{ label: string; onClick: () => void }>;
}

export function WaitingCard({ title, detail, actions = [] }: WaitingCardProps) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex gap-3 items-start">
      <Hourglass size={16} className="text-amber-700 shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-extrabold text-amber-900 m-0">{title}</p>
        <p className="text-[11px] text-amber-900/80 mt-1 mb-0 leading-relaxed">{detail}</p>
        {actions.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-2.5">
            {actions.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={a.onClick}
                className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 transition active:scale-95 cursor-pointer"
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
