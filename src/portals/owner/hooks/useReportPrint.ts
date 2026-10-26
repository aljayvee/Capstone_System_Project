import { useCallback, useState } from "react";
import { apiService, type ApiDateRange, type ReportPdfType } from "../../../services/apiService";
import { printPdfBlob } from "../../../utils/printPdfBlob";

interface UseReportPrintResult {
  print: () => Promise<void>;
  isPreparing: boolean;
  error: string | null;
}

/**
 * Prints one report: fetches the server's PDF over the window the page is
 * showing, then opens the browser's print screen on it. Nothing downloads.
 *
 * The server records every print it hands out (who, which report, which
 * dates) before it sends the document, so this needs no audit call of its own.
 *
 * Sits beside useReport.ts and keeps the same shape, so the six report views do
 * not each re-implement the in-flight/error pair. The guard against a second
 * click while one is in flight matters here more than usual: a report is a real
 * query and a logged print, and an impatient double-click would do both twice.
 */
export function useReportPrint(reportType: ReportPdfType, range: ApiDateRange): UseReportPrintResult {
  const [isPreparing, setIsPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = `${range.period ?? ""}|${range.date ?? ""}|${range.start ?? ""}|${range.end ?? ""}|${range.riderId ?? ""}`;

  const print = useCallback(async () => {
    if (isPreparing) return;

    setIsPreparing(true);
    setError(null);

    const result = await apiService.downloadReportPdf(reportType, range);

    if ("error" in result) {
      setError(result.error);
    } else {
      try {
        await printPdfBlob(result.blob);
      } catch {
        setError("The print screen could not open in this browser. Please try again.");
      }
    }

    setIsPreparing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType, key, isPreparing]);

  return { print, isPreparing, error };
}
