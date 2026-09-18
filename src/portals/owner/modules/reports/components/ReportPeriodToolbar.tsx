import React from "react";
import { FileText, Download, Loader2 } from "lucide-react";
import type { DateRange } from "../../../../../components/DateRangePicker";
import { RangeSelector, type RangePreset } from "../../../../../components/RangeSelector";

/**
 * The CSV export is HIDDEN, not removed.
 *
 * Every view's `handleExportCSV` and `src/utils/downloadCSV.ts` stay intact and
 * wired — `onExportCSV` is still a required prop, so the handlers remain
 * type-checked and reachable. Only the button is unrendered. Flip this to `true`
 * to bring it back; nothing else has to change.
 *
 * Annotated `: boolean` on purpose. Left to infer the literal `false`,
 * TypeScript narrows the `&&` branch below to unreachable and editors start
 * reporting the button as dead code.
 */
const SHOW_CSV_EXPORT: boolean = false;

interface ReportPeriodToolbarProps {
  preset: RangePreset;
  onPresetChange: (preset: RangePreset) => void;
  range: DateRange | null;
  onRangeChange: (range: DateRange | null) => void;
  /** Opens the on-screen preview. The PDF itself comes from the server. */
  onPreview: () => void;
  onExportCSV: () => void;
  exportDisabled?: boolean;
  isGeneratingPdf?: boolean;
}

/**
 * Shared by all 6 report views — window selection and the export actions look
 * and behave identically everywhere they appear.
 *
 * The period pills and the calendar come from RangeSelector, the same component
 * the Dashboard header uses, so the two surfaces cannot drift apart in either
 * appearance or behaviour.
 */
export const ReportPeriodToolbar: React.FC<ReportPeriodToolbarProps> = ({
  preset,
  onPresetChange,
  range,
  onRangeChange,
  onPreview,
  onExportCSV,
  exportDisabled,
  isGeneratingPdf,
}) => {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3 border-b border-hairline pb-4">
      <RangeSelector
        preset={preset}
        onPresetChange={onPresetChange}
        range={range}
        onRangeChange={onRangeChange}
      />

      <div className="flex items-center gap-3">
        <button
          onClick={onPreview}
          disabled={exportDisabled || isGeneratingPdf}
          className="flex items-center gap-2 bg-board-field hover:bg-board-field-deep text-white text-label px-4 py-2.5 rounded-plate transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGeneratingPdf ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <FileText size={15} />
          )}
          {isGeneratingPdf ? "Preparing PDF..." : "Export PDF"}
        </button>

        {SHOW_CSV_EXPORT && (
          <button
            onClick={onExportCSV}
            disabled={exportDisabled}
            className="flex items-center gap-2 bg-board-plate border border-edge hover:bg-board-ground text-ink text-label px-4 py-2.5 rounded-plate transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={15} /> Export CSV
          </button>
        )}
      </div>
    </div>
  );
};
