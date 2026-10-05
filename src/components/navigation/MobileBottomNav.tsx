import React, { useState } from "react";
import { MoreHorizontal, X } from "lucide-react";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";

export interface MobileNavTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
  isActive: boolean;
  onClick: () => void;
  description?: string;
}

interface MobileBottomNavProps {
  primaryTabs: MobileNavTab[];
  moreTabs?: MobileNavTab[];
  moreLabel?: string;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  primaryTabs,
  moreTabs = [],
  moreLabel = "More",
}) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  useBodyScrollLock(isMoreOpen);

  const isAnyMoreActive = moreTabs.some((t) => t.isActive);

  return (
    <>
      {/* Off-Canvas 'More' Bottom Action Sheet */}
      {isMoreOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end select-none animate-fade-in">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsMoreOpen(false)}
          />

          {/* Sheet Container */}
          <div className="relative z-10 w-full bg-[#0F1A30] border-t border-slate-700/80 rounded-t-2xl shadow-2xl p-5 pb-safe max-h-[80dvh] overflow-y-auto mobile-scroll-contain">
            {/* Drag handle */}
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-4" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
                Additional Modules & Management
              </span>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Grid of secondary modules */}
            <div className="grid grid-cols-2 gap-2.5">
              {moreTabs.map((tab) => {
                const active = tab.isActive;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      tab.onClick();
                      setIsMoreOpen(false);
                    }}
                    className={`min-h-[56px] p-3 rounded-xl border flex flex-col items-start gap-1.5 transition-all text-left active-press cursor-pointer ${
                      active
                        ? "bg-red-600/15 border-red-500/80 text-white"
                        : "bg-[#0B132B] border-slate-800/80 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={active ? "text-red-400" : "text-slate-400"}>
                        {tab.icon}
                      </span>
                      {tab.badge !== undefined && tab.badge !== 0 && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-red-600 text-white">
                          {tab.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-semibold leading-tight">{tab.label}</span>
                    {tab.description && (
                      <span className="text-[10px] text-slate-500 leading-none truncate max-w-full">
                        {tab.description}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Primary Sticky Bottom Thumb Bar */}
      <nav
        className="fixed bottom-0 inset-x-0 z-40 bg-[#0B132B]/95 border-t border-slate-800/80 pb-safe backdrop-blur-md select-none"
        aria-label="Mobile Bottom Navigation"
      >
        <div className="flex items-stretch justify-around h-14 px-1">
          {primaryTabs.map((tab) => {
            const active = tab.isActive;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={tab.onClick}
                className={`flex-1 min-h-[48px] flex flex-col items-center justify-center gap-0.5 px-1 transition-colors active-press relative cursor-pointer ${
                  active ? "text-red-500 font-semibold" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <div className="relative">
                  {tab.icon}
                  {tab.badge !== undefined && tab.badge !== 0 && (
                    <span className="absolute -top-1 -right-2 text-[9px] font-mono font-bold px-1 min-w-[14px] h-[14px] rounded-full bg-red-600 text-white flex items-center justify-center">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] tracking-tight leading-none truncate max-w-[64px]">
                  {tab.label}
                </span>
                {active && (
                  <span className="w-1 h-1 rounded-full bg-red-500 absolute bottom-1" />
                )}
              </button>
            );
          })}

          {/* 'More' tab if additional modules exist */}
          {moreTabs.length > 0 && (
            <button
              type="button"
              onClick={() => setIsMoreOpen(true)}
              className={`flex-1 min-h-[48px] flex flex-col items-center justify-center gap-0.5 px-1 transition-colors active-press relative cursor-pointer ${
                isAnyMoreActive
                  ? "text-red-500 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <div className="relative">
                <MoreHorizontal className="w-5 h-5" />
                {isAnyMoreActive && (
                  <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-red-500" />
                )}
              </div>
              <span className="text-[10px] tracking-tight leading-none truncate max-w-[64px]">
                {moreLabel}
              </span>
              {isAnyMoreActive && (
                <span className="w-1 h-1 rounded-full bg-red-500 absolute bottom-1" />
              )}
            </button>
          )}
        </div>
      </nav>
    </>
  );
};

export default MobileBottomNav;
