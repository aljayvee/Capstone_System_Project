/** Mirrors server/src/services/integrationCheckService.ts. */
export type IntegrationStatus = "ok" | "warn" | "down" | "off" | "unchecked";

export interface IntegrationResult {
  key: string;
  label: string;
  purpose: string;
  group: "core" | "features";
  status: IntegrationStatus;
  summary: string;
  latencyMs: number;
}

export interface IntegrationReport {
  checkedAt: string;
  durationMs: number;
  overall: "ok" | "warn" | "down";
  results: IntegrationResult[];
}
