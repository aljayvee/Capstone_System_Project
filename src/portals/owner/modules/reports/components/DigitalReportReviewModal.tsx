import React from "react";
import { Printer, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogFooter } from "@/components/ui/dialog";

interface DigitalReportReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportName: string;
  rangeLabel: string;
  onPrintNow: () => void;
  children: React.ReactNode;
}

// The "Digital Report Review" step from the proposal's report storyboards:
// Print -> preview -> Print Now. Shared across all 5 report types; each view
// supplies its own printable summary as children.
export const DigitalReportReviewModal: React.FC<DigitalReportReviewModalProps> = ({
  open,
  onOpenChange,
  reportName,
  rangeLabel,
  onPrintNow,
  children,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Digital Report Review — {reportName}</DialogTitle>
          <DialogClose className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X size={18} />
          </DialogClose>
        </DialogHeader>

        <p className="text-xs text-slate-500 -mt-2">{rangeLabel}</p>

        <div className="max-h-[55vh] overflow-y-auto border border-slate-100 rounded-xl p-4">{children}</div>

        <DialogFooter className="flex-row gap-3">
          <button
            onClick={() => onOpenChange(false)}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition"
          >
            Back
          </button>
          <button
            onClick={onPrintNow}
            className="flex-1 py-2.5 rounded-xl bg-[#1E3A5F] hover:bg-[#162D4A] text-white text-sm font-semibold transition flex items-center justify-center gap-2"
          >
            <Printer size={16} /> Print Now
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
