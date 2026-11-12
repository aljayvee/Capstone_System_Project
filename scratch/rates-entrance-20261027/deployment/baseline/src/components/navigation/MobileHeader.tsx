import React from "react";

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  subtitle,
  leftElement,
  rightElement,
}) => {
  return (
    <header data-mobile-header className="sticky top-0 z-30 w-full bg-board-plate border-b border-edge pt-safe px-3.5 select-none">
      <div className="h-12 flex items-center justify-between gap-3">
        {/* Left Chrome (Logo or Back action) */}
        <div className="flex flex-1 items-center gap-2.5 min-w-0">
          {leftElement || (
            <div className="w-7 h-7 rounded-lg bg-signal flex items-center justify-center text-white font-bold text-xs tracking-wider shrink-0 shadow-xs">
              SG
            </div>
          )}

          {/* Title & Subtitle */}
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-ink tracking-tight truncate leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[10px] text-ink-muted font-mono truncate leading-none mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right Actions */}
        {rightElement && (
          <div className="flex items-center gap-2 shrink-0">
            {rightElement}
          </div>
        )}
      </div>
    </header>
  );
};

export default MobileHeader;
