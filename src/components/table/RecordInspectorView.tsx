import React, { useEffect } from "react";
import { ArrowLeft, X } from "lucide-react";
import CopyChip from "../common/CopyChip";

export interface InspectorItem {
  label: string;
  value: React.ReactNode;
  copyable?: boolean;
  copyValue?: string;
  fullWidth?: boolean;
}

export interface InspectorSection {
  title: string;
  items: InspectorItem[];
}

export interface RecordInspectorViewProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  statusBadge?: React.ReactNode;
  sections?: InspectorSection[];
  children?: React.ReactNode;
  actions?: React.ReactNode;
}

export const RecordInspectorView: React.FC<RecordInspectorViewProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  statusBadge,
  sections,
  children,
  actions,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    // Prevent background scrolling while full-screen inspector is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
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
      className="fixed inset-0 z-50 bg-[#070D1B] sm:bg-[#0B132B] flex flex-col overflow-hidden animate-in fade-in duration-150"
    >
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-10 shrink-0 bg-[#0B132B]/95 border-b border-slate-800/80 px-4 pt-safe pb-3 flex items-center justify-between gap-3 backdrop-blur-md">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 px-3 py-2 -ml-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 active:scale-95 transition-all text-xs font-semibold select-none cursor-pointer min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4 shrink-0 text-slate-400" />
          <span>Back to Table</span>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          {statusBadge}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 active:scale-95 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Title & Metadata Banner */}
      <div className="px-5 pt-4 pb-3 bg-gradient-to-b from-slate-900/60 to-transparent border-b border-slate-800/40 shrink-0">
        <h2 className="text-base font-bold text-white tracking-tight truncate">{title}</h2>
        {subtitle && (
          <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>
        )}
      </div>

      {/* Scrollable Body Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4 pb-28">
        {sections && sections.length > 0 ? (
          sections.map((section, sIdx) => (
            <div
              key={sIdx}
              className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-sm"
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                {section.title}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {section.items.map((item, iIdx) => (
                  <div
                    key={iIdx}
                    className={`space-y-1 ${
                      item.fullWidth ? "col-span-1 sm:col-span-2" : ""
                    }`}
                  >
                    <span className="text-[11px] font-medium text-slate-400 block">
                      {item.label}
                    </span>
                    <div className="text-xs font-medium text-slate-200 break-words flex items-center gap-2">
                      {item.copyable && item.copyValue ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{item.value}</span>
                          <CopyChip value={item.copyValue} />
                        </div>
                      ) : (
                        <span>{item.value}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : null}

        {children}
      </div>

      {/* Sticky Bottom Actions Bar */}
      {actions && (
        <footer className="sticky bottom-0 z-10 shrink-0 bg-[#0B132B]/95 border-t border-slate-800/90 p-4 pb-safe flex flex-col gap-2 backdrop-blur-md">
          {actions}
        </footer>
      )}
    </div>
  );
};

export default RecordInspectorView;
