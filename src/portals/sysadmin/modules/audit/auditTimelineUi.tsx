import React from "react";
import type { AuditSeverity } from "../../../../types/sysAdminAuditTimeline";

const TONE: Record<AuditSeverity, string> = {
  info: "bg-board-ground text-ink-muted border-edge",
  notice: "bg-board-ground text-ink border-edge",
  warning: "bg-status-waiting-fill text-status-waiting-ink border-status-waiting-ink/30",
  critical: "bg-status-act-fill text-status-act-ink border-status-act-ink/30",
};

export function SeverityChip({ severity }: { severity: AuditSeverity }) {
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-mono font-semibold uppercase whitespace-nowrap ${TONE[severity]}`}>
      {severity}
    </span>
  );
}

export function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "medium" });
}

export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
