import React from "react";
import { AlertCircle, X } from "lucide-react";

interface StickyFormErrorSummaryProps {
  errors: string[];
  onDismiss?: () => void;
}

export const StickyFormErrorSummary: React.FC<StickyFormErrorSummaryProps> = ({
  errors,
  onDismiss,
}) => {
  if (!errors || errors.length === 0) return null;

  return (
    <div className="sticky top-0 z-20 mb-4 p-3.5 rounded-xl bg-red-950/90 border border-red-800/80 text-red-200 text-xs shadow-lg backdrop-blur-sm animate-fade-in select-none">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-white">Please check the following fields:</div>
            <ul className="mt-1 space-y-0.5 list-disc list-inside text-red-300/90 text-[11px]">
              {errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 rounded text-red-400 hover:text-white hover:bg-red-900/60 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default StickyFormErrorSummary;
