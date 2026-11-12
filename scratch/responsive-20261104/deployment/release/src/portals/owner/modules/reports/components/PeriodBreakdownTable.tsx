import React from "react";
import type { ApiPeriodPoint, BreakdownUnit } from "../../../../../services/apiService";
import { formatPeso } from "../../../../../utils/format";
import { MobileResponsiveTable } from "../../../../../components/table";

/** One figure column of a breakdown, with how to show it. */
export interface BreakdownFigure<P> {
  header: string;
  value: (p: P) => number;
  format: "count" | "money";
  /** The figure a phone card shows on the right. One per table. */
  primary?: boolean;
  /** Money that can go negative (cash short): below zero reads red. */
  signed?: boolean;
}

interface PeriodBreakdownTableProps<P extends ApiPeriodPoint> {
  /** "Sales" becomes "Sales per day". */
  subject: string;
  unit?: BreakdownUnit;
  points?: P[];
  figures: BreakdownFigure<P>[];
}

const UNIT_HEADER: Record<BreakdownUnit, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
  year: "Year",
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * The period breakdown every report opens with, on screen and in print: one row
 * per day (Sunday to Saturday), week, month or year, then a Total row.
 *
 * The rows come from the server, which splits them the same way for the PDF,
 * so the table here and the first table on the printout are the same table.
 */
export function PeriodBreakdownTable<P extends ApiPeriodPoint>({
  subject,
  unit = "day",
  points,
  figures,
}: PeriodBreakdownTableProps<P>) {
  if (!points || points.length === 0) return null;

  const title = `${subject} per ${unit}`;
  const unitHeader = UNIT_HEADER[unit];
  const primary = figures.find((f) => f.primary) ?? figures[0];
  const totals = figures.map((f) => round2(points.reduce((sum, p) => sum + f.value(p), 0)));
  const nothingRecorded = totals.every((t) => t === 0);

  const show = (figure: BreakdownFigure<P>, n: number) =>
    figure.format === "money" ? formatPeso(n) : String(n);

  const tone = (figure: BreakdownFigure<P>, n: number) =>
    figure.signed && n < 0 ? "text-status-act-ink" : n === 0 ? "text-ink-muted" : "text-ink";

  const desktopTable = (
    <div className="bg-board-plate border border-edge rounded-plate overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-label">
          <thead className="bg-board-ground text-ink-muted">
            <tr>
              <th scope="col" className="text-left px-5 py-2 font-semibold">
                {unitHeader}
              </th>
              <th scope="col" className="text-left px-5 py-2 font-semibold">
                Dates
              </th>
              {figures.map((f) => (
                <th key={f.header} scope="col" className="text-right px-5 py-2 font-semibold whitespace-nowrap">
                  {f.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.label} className="border-t border-hairline">
                <th scope="row" className="text-left px-5 py-2.5 font-semibold text-ink whitespace-nowrap">
                  {p.label}
                </th>
                <td className="px-5 py-2.5 text-ink-muted whitespace-nowrap">{p.dateLabel ?? ""}</td>
                {figures.map((f) => {
                  const n = f.value(p);
                  return (
                    <td
                      key={f.header}
                      className={`px-5 py-2.5 text-right font-mono tabular-nums ${tone(f, n)}`}
                    >
                      {show(f, n)}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="border-t-2 border-edge font-bold text-ink">
              <th scope="row" className="text-left px-5 py-2.5">
                Total
              </th>
              <td />
              {figures.map((f, i) => (
                <td
                  key={f.header}
                  className={`px-5 py-2.5 text-right font-mono tabular-nums ${
                    f.signed && totals[i] < 0 ? "text-status-act-ink" : ""
                  }`}
                >
                  {show(f, totals[i])}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <section className="space-y-3" aria-label={title}>
      <h3 className="text-panel text-ink">{title}</h3>
      {nothingRecorded && (
        <p className="text-label text-ink-muted">Nothing was recorded for these dates.</p>
      )}

      <MobileResponsiveTable<P>
        data={points}
        keyExtractor={(p) => p.label}
        desktopView={desktopTable}
        primaryHeader={unitHeader}
        secondaryHeader={primary.header}
        renderPrimary={(p) => (
          <div className="min-w-0">
            <div className="font-semibold text-ink text-xs truncate">{p.label}</div>
            {p.dateLabel && <div className="text-[10px] text-ink-muted">{p.dateLabel}</div>}
          </div>
        )}
        renderSecondary={(p) => (
          <div
            className={`text-right shrink-0 font-mono font-semibold text-xs tabular-nums ${tone(
              primary,
              primary.value(p),
            )}`}
          >
            {show(primary, primary.value(p))}
          </div>
        )}
        renderPreview={(p) => (
          <div className="space-y-1.5 pt-1">
            {figures
              .filter((f) => f !== primary)
              .map((f) => (
                <div key={f.header} className="flex items-center justify-between text-[11px]">
                  <span className="text-ink-muted">{f.header}</span>
                  <span className={`font-mono font-medium tabular-nums ${tone(f, f.value(p))}`}>
                    {show(f, f.value(p))}
                  </span>
                </div>
              ))}
          </div>
        )}
        inspectorTitle={(p) => p.label}
        inspectorSubtitle={(p) => p.dateLabel ?? title}
        inspectorSections={(p) => [
          {
            title,
            items: figures.map((f) => ({ label: f.header, value: show(f, f.value(p)) })),
          },
        ]}
      />
    </section>
  );
}
