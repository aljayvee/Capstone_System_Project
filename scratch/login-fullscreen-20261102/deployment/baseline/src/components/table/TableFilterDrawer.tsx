import React, { useEffect } from "react";
import { X, Filter, RotateCcw, Check } from "lucide-react";

export interface TableFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onReset?: () => void;
  onApply?: () => void;
  title?: string;
  activeFilterCount?: number;
  children: React.ReactNode;
}

export const TableFilterDrawer: React.FC<TableFilterDrawerProps> = ({
  isOpen,
  onClose,
  onReset,
  onApply,
  title = "Filter Records",
  activeFilterCount = 0,
  children,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-in fade-in duration-200"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
      />

      {/* Drawer Content */}
      <div className="relative w-full max-w-lg bg-[#0B132B] border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl max-h-[85dvh] flex flex-col shadow-2xl z-10 animate-in slide-in-from-bottom duration-250">
        {/* Drawer Pull Handle (Mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-slate-700/60" />
        </div>

        {/* Drawer Header */}
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-bold text-white">{title}</h3>
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                {activeFilterCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Filter Drawer"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
          {children}
        </div>

        {/* Drawer Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800/80 bg-slate-900/50 pb-safe flex items-center justify-between gap-3 shrink-0">
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 transition-all text-xs font-semibold min-h-[44px] cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset All</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (onApply) onApply();
              onClose();
            }}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs shadow-lg shadow-red-950/40 active:scale-95 transition-all min-h-[44px] cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Apply Filters</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TableFilterDrawer;
