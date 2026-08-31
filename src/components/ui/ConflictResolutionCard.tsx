import React from "react";
import { RefreshCw, AlertTriangle, ArrowRight } from "lucide-react";

interface ConflictResolutionCardProps {
  title?: string;
  description?: string;
  onResolve: () => void;
  onCancel?: () => void;
  resolveButtonText?: string;
  cancelButtonText?: string;
  isLoading?: boolean;
}

export const ConflictResolutionCard: React.FC<ConflictResolutionCardProps> = ({
  title = "Update Conflict Detected",
  description = "Another dispatcher or process modified this record while you were editing. Refresh to review the latest state.",
  onResolve,
  onCancel,
  resolveButtonText = "Sync Latest Changes",
  cancelButtonText = "Dismiss",
  isLoading = false,
}) => {
  return (
    <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 sm:p-5 shadow-xs text-left space-y-3.5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
          <AlertTriangle size={18} strokeWidth={2.2} />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-amber-900 leading-snug">{title}</h4>
          <p className="text-xs text-amber-800 leading-relaxed font-normal">{description}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="py-2 px-3 text-xs font-semibold text-amber-900 hover:text-amber-950 bg-white border border-amber-300 hover:bg-amber-50/50 rounded-xl transition cursor-pointer"
          >
            {cancelButtonText}
          </button>
        )}
        <button
          type="button"
          onClick={onResolve}
          disabled={isLoading}
          className="flex-1 py-2 px-3 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-50 rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
        >
          {isLoading ? (
            <>
              <RefreshCw size={13} className="animate-spin" />
              <span>Syncing...</span>
            </>
          ) : (
            <>
              <span>{resolveButtonText}</span>
              <ArrowRight size={13} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ConflictResolutionCard;
