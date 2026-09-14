import { useCallback, useState } from "react";
import { apiService, type ApiDateRange, type ReportPdfType } from "../../../services/apiService";
import { saveBlob } from "../../../utils/downloadBlob";

interface UseReportPdfResult {
  generate: () => Promise<void>;
  isGenerating: boolean;
  error: string | null;
}

/**
 * Downloads one report as a server-generated PDF, over the same window the page
 * is showing.
 *
 * Sits beside useReport.ts and keeps the same shape, so the six report views do
 * not each re-implement the in-flight/error pair. The guard against a second
 * click while one is in flight matters here more than usual: a report is a real
 * query, and an impatient double-click would run it twice and hand the owner two
 * identical files.
 */
export function useReportPdf(reportType: ReportPdfType, range: ApiDateRange): UseReportPdfResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = `${range.period ?? ""}|${range.date ?? ""}|${range.start ?? ""}|${range.end ?? ""}`;

  const generate = useCallback(async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    setError(null);

    const result = await apiService.downloadReportPdf(reportType, range);

    if ("error" in result) {
      setError(result.error);
    } else {
      saveBlob(result.blob, result.filename);
    }

    setIsGenerating(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType, key, isGenerating]);

  return { generate, isGenerating, error };
}
