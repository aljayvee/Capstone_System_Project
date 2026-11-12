import * as React from "react";
import type { DispatcherDashboardSummary } from "@/types/errand";
import type { RiderFleetMember } from "@/hooks/useRiderFleetPresence";
import { PanelShell } from "@/components/panel/PanelShell";
import { PanelState } from "@/components/panel/PanelState";
import { DispatcherPulseStrip } from "./DispatcherPulseStrip";
import { DispatcherAttentionRadar } from "./DispatcherAttentionRadar";
import { DispatcherFleetMatrix } from "./DispatcherFleetMatrix";

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
      className="dispatcher-dashboard"
      title="Dashboard"
    >
      <PanelState
        isLoading={isLoading && !summary}
        error={loadError}
        onRetry={onRefresh}
        errorTitle="Could not load dashboard"
        errorBody="Check your connection and try again."
      >
        <div className="space-y-4 pb-8">
          {/* TIER 1: Operational Pulse Strip */}
          <DispatcherPulseStrip
            summary={summary}
            onlineRidersCount={onlineRidersCount}
            totalRidersCount={totalRidersCount}
            onNavigateTab={onNavigateTab}
          />

          {/* TIER 2 & 3: Attention Radar (60%) & Live Fleet Matrix (40%) */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 min-h-[380px]">
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

        </div>
      </PanelState>
    </PanelShell>
  );
};
