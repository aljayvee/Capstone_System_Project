import * as React from "react";
import type { DispatcherDashboardSummary } from "@/types/errand";
import type { RiderFleetMember } from "@/hooks/useRiderFleetPresence";
import { PanelShell } from "@/components/panel/PanelShell";
import { PanelState } from "@/components/panel/PanelState";
import { DispatcherButton } from "@/components/panel/DispatcherButton";
import { DispatcherPulseStrip } from "./DispatcherPulseStrip";
import { DispatcherAttentionRadar } from "./DispatcherAttentionRadar";
import { DispatcherFleetMatrix } from "./DispatcherFleetMatrix";
import { DispatcherPipelineTracker } from "./DispatcherPipelineTracker";
import { DispatcherOperationalMetrics } from "./DispatcherOperationalMetrics";
import { RotateCcw } from "lucide-react";

interface DispatcherDashboardViewProps {
  summary: DispatcherDashboardSummary | null;
  isLoading: boolean;
  loadError: string | null;
  onRefresh: () => void;
  riders: RiderFleetMember[];
  onClaimAndSelect: (errandId: string) => void;
  onOpenChat: (errandId: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const DispatcherDashboardView: React.FC<DispatcherDashboardViewProps> = ({
  summary,
  isLoading,
  loadError,
  onRefresh,
  riders,
  onClaimAndSelect,
  onOpenChat,
  onNavigateTab,
}) => {
  const onlineRidersCount = riders.filter((r) => r.presence === "AVAILABLE_ONLINE").length;
  const totalRidersCount = riders.length;

  return (
    <PanelShell
      title="Operational Command Dashboard"
      detail="Real-time situational pulse, bottleneck radar & fleet telemetry • Tacurong Hub"
      aside={
        <DispatcherButton
          variant="subtle"
          size="sm"
          icon={<RotateCcw size={14} className={isLoading ? "animate-spin" : ""} />}
          onClick={onRefresh}
          disabled={isLoading}
        >
          {isLoading ? "Refreshing..." : "Refresh"}
        </DispatcherButton>
      }
    >
      <PanelState
        isLoading={isLoading && !summary}
        error={loadError}
        onRetry={onRefresh}
        errorTitle="Could not load situational dashboard"
        errorBody="The dispatch summary service could not be reached. Check network connection or retry."
      >
        <div className="space-y-3.5 pb-8">
          {/* TIER 1: Operational Pulse Strip */}
          <DispatcherPulseStrip
            summary={summary}
            onlineRidersCount={onlineRidersCount}
            totalRidersCount={totalRidersCount}
            onNavigateTab={onNavigateTab}
          />

          {/* TIER 2 & 3: Attention Radar (60%) & Live Fleet Matrix (40%) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 min-h-[380px]">
            <div className="lg:col-span-7 h-full">
              <DispatcherAttentionRadar
                items={summary?.attentionItems || []}
                onClaimAndSelect={onClaimAndSelect}
                onOpenChat={onOpenChat}
                onNavigateTab={onNavigateTab}
              />
            </div>
            <div className="lg:col-span-5 h-full">
              <DispatcherFleetMatrix
                riders={riders}
                onNavigateTab={onNavigateTab}
              />
            </div>
          </div>

          {/* TIER 4: Active Pipeline Milestone Tracker */}
          <DispatcherPipelineTracker
            pipeline={
              summary?.pipeline || {
                claimed: 0,
                toStore: 0,
                bought: 0,
                onTheWay: 0,
                delivered: 0,
              }
            }
            onNavigateTab={onNavigateTab}
          />

          {/* TIER 5: Operational Metrics (Merchants, Declines, My Shift Velocity) */}
          <DispatcherOperationalMetrics
            topMerchantsToday={summary?.topMerchantsToday || []}
            todayDeclines={summary?.todayDeclines || []}
            myShiftStats={
              summary?.myShiftStats || {
                myHandledToday: 0,
                myAvgClaimLatencySeconds: null,
              }
            }
          />
        </div>
      </PanelState>
    </PanelShell>
  );
};
