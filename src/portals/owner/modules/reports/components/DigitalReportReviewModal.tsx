import React from "react";
import { Printer, Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";

interface DigitalReportReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportName: string;
  rangeLabel: string;
  onDownloadPdf: () => void;
  isGenerating?: boolean;
  generateError?: string | null;
  children: React.ReactNode;
}

/**
 * The "Digital Report Review" step from the proposal's report storyboards:
 * preview -> print. Shared across all 6 report types; each view supplies its
 * own summary as children.
 */
export const DigitalReportReviewModal: React.FC<DigitalReportReviewModalProps> = ({
  open,
  onOpenChange,
  reportName,
  rangeLabel,
  onDownloadPdf,
  isGenerating,
  generateError,
  children,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Print Preview: {reportName}</DialogTitle>
          <DialogClose className="p-1 rounded-trim text-ink-muted hover:text-ink-muted hover:bg-board-ground">
            <X size={18} />
          </DialogClose>
        </DialogHeader>

        <p className="text-label text-ink-muted -mt-2">{rangeLabel}</p>

        <div className="max-h-[55vh] overflow-y-auto border border-hairline rounded-plate p-4">
          {children}
        </div>

        <p className="text-label text-ink-muted -mt-1">
          The printable report is formatted in the standard Sugo report document layout, with full
          tables and financial summaries.
        </p>

        {generateError && (
          <p className="text-body text-status-act-ink" role="alert">
            {generateError}
          </p>
        )}

        <DialogFooter className="flex-row gap-3">
          <button
            onClick={() => onOpenChange(false)}
            className="flex-1 py-2.5 rounded-plate border border-edge text-ink-muted text-label hover:bg-board-ground transition"
          >
            Back
          </button>
          <button
            onClick={onDownloadPdf}
            disabled={isGenerating}
            className="flex-1 py-2.5 rounded-plate bg-board-field hover:bg-board-field-deep text-white text-label transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
            {isGenerating ? "Preparing Print..." : "Print Report"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
