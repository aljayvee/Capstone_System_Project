import React from "react";
import { AlertCircle } from "lucide-react";

interface InlineFieldErrorProps {
  error?: string | null;
  className?: string;
  id?: string;
}

export const InlineFieldError: React.FC<InlineFieldErrorProps> = ({
  error,
  className = "",
  id,
}) => {
  if (!error) return null;

  return (
    <div
      id={id}
      role="alert"
      aria-live="polite"
      className={`flex items-start gap-1.5 mt-1.5 text-xs text-rose-600 font-medium select-none ${className}`}
    >
      <AlertCircle size={14} className="shrink-0 mt-0.5 text-rose-500" />
      <span className="leading-tight">{error}</span>
    </div>
  );
};

export default InlineFieldError;
