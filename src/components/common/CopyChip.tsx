import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyChipProps {
  value: string;
  displayLabel?: string;
  className?: string;
}

export const CopyChip: React.FC<CopyChipProps> = ({
  value,
  displayLabel,
  className = "",
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(50);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`Tap to copy: ${value}`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 min-h-[32px] sm:min-h-[28px] rounded-lg border text-xs font-mono transition-all active-press cursor-pointer select-none ${
        copied
          ? "bg-emerald-950/60 border-emerald-500/80 text-emerald-300"
          : "bg-slate-900/90 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white"
      } ${className}`}
    >
      <span className="truncate max-w-[180px] sm:max-w-none">
        {displayLabel || value}
      </span>
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-slate-500 shrink-0" />
      )}
    </button>
  );
};

export default CopyChip;
