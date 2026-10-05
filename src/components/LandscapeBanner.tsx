import React, { useState } from "react";
import { RotateCw, X } from "lucide-react";
import { useDeviceTier } from "../hooks/useDeviceTier";

export const LandscapeBanner: React.FC = () => {
  const { isShallowLandscape } = useDeviceTier();
  const [dismissed, setDismissed] = useState(false);

  if (!isShallowLandscape || dismissed) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-amber-950/95 border-b border-amber-600/60 text-amber-200 px-3 py-1.5 flex items-center justify-between text-xs backdrop-blur-sm animate-fade-in select-none">
      <div className="flex items-center gap-2">
        <RotateCw className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-spin-slow" />
        <span className="font-medium text-[11px] leading-tight">
          Rotate to Portrait for optimal operational view
        </span>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="p-1 rounded hover:bg-amber-900/60 text-amber-400 cursor-pointer"
        aria-label="Dismiss orientation advisory"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default LandscapeBanner;
