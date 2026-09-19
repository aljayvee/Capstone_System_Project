import React from "react";
import { Phone } from "lucide-react";
import { StandingFigures } from "../../components/StandingFigures";
import {
  useRiderFleetPresence,
  RIDER_STATUS_THEMES,
} from "../../../../hooks/useRiderFleetPresence";
import { OwnerPanelShell } from "../../components/OwnerPanelShell";
import { PanelState } from "@/components/panel";

export const RiderManagementModule: React.FC = () => {
  const { riders, isLoading, loadError, reload } = useRiderFleetPresence();

  /**
   * A count nobody received is a dash, not a zero.
   *
   * These three tiles read 0 whenever /riders was unreachable, which claimed
   * the fleet was empty. The roster is kept on screen through a transient
   * failure, so a stale count is still worth showing; it is only unknown when
   * the request failed AND nothing had arrived yet.
   */
  const unknown = loadError !== null && riders.length === 0;
  const count = (n: number) => (unknown ? "--" : String(n));

  // Counted from `presence` — the same state the Live Map paints its pins from.
  //
  // These used to be derived from `online` and `activeOrdersCount` directly,
  // which is how this board could report three Available riders while the map
  // showed the same three as signal-lost: two derivations of one fact, from a
  // hook that returns both.
  const availableCount = riders.filter((r) => r.presence === "AVAILABLE").length;
  const onErrandCount = riders.filter((r) => r.presence === "BUSY").length;
  const offlineCount = riders.filter(
    (r) => r.presence === "DISCONNECTED" || r.presence === "OFF_DUTY",
  ).length;

  return (
    <OwnerPanelShell
      title="Riders"
      controls={
        /* Three identical metric cards in a row above a roster table is the
           arrangement the direction contract refuses by name. These are the
           same kind of fact the tracking band states - what is true about the
           fleet right now - so they are stated the same way, which also makes
           the two screens read as one product rather than two dashboards. */
        <StandingFigures
          label="The roster right now"
          figures={[
            { label: "Available", value: count(availableCount), sub: "Waiting for a run" },
            { label: "On errand", value: count(onErrandCount), sub: "Carrying an errand" },
            { label: "Offline / off duty", value: count(offlineCount), sub: "Not on shift" },
          ]}
        />
      }
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="mb-3 flex shrink-0 items-center justify-between border-b border-hairline pb-3">
          <h2 className="text-micro uppercase text-ink">Rider Roster</h2>
          <span data-figure className="text-label tabular-nums text-ink-muted">
            {unknown ? "-- registered" : `${riders.length} registered`}
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pb-2 pr-1">
          {/* PanelState orders error before isEmpty, so a dead /riders can no
              longer render "No riders registered yet." The old ternary put
              isLoading first and emptiness second, with no third branch at
              all, because the hook had no error to give it. */}
          <PanelState
            isLoading={isLoading}
            error={loadError}
            onRetry={reload}
            errorTitle="The rider roster did not load"
            // Without this the body fell back to the hook's own message, which
            // is this exact sentence, so the panel said it twice.
            errorBody="Nobody is listed because nothing arrived, not because no riders are registered. The counts above read as dashes for the same reason."
            isEmpty={riders.length === 0}
            emptyTitle="No riders registered yet"
            emptyBody="Riders appear here once they have an account. This says nothing about who is on shift."
            loadingRows={3}
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {riders.map((r) => (
                <div
                  key={r.id}
                  className="space-y-3 rounded-plate border border-edge bg-board-plate p-3.5 transition-colors hover:bg-board-ground"
                >
                  <div className="flex items-start justify-between gap-2">
                    {/* min-w-0 and truncate: the name row had neither, so a
                        long rider name pushed the status badge out of the
                        card rather than ellipsising. */}
                    <div className="min-w-0">
                      <h3 className="truncate text-panel text-ink">{r.name}</h3>
                      <p data-figure className="mt-0.5 font-mono text-micro text-ink-muted">
                        Rider ID: #{r.id}
                      </p>
                    </div>
                    {/* Same theme table the map's pins and legend read, so a
                        rider's badge here and their pin colour there can never
                        say different things. */}
                    <span
                      className={`shrink-0 rounded-full border border-edge px-2.5 py-0.5 text-micro uppercase ${
                        RIDER_STATUS_THEMES[r.presence].badgeClassName
                      }`}
                      title={
                        r.presence === "DISCONNECTED" && r.presumed
                          ? "Presumed offline, no beacon received. A powered-off handset and one in a dead zone send identically nothing."
                          : RIDER_STATUS_THEMES[r.presence].description
                      }
                    >
                      {RIDER_STATUS_THEMES[r.presence].badgeLabel}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-hairline pt-2.5 text-label">
                    <span className="flex min-w-0 items-center gap-1.5 text-ink-muted">
                      <Phone size={12} className="shrink-0" />
                      <span data-figure className="truncate font-mono">
                        {r.phone || "--"}
                      </span>
                    </span>
                    <span data-figure className="shrink-0 text-data text-ink">
                      {r.activeOrdersCount} Active Order(s)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </PanelState>
        </div>
      </div>
    </OwnerPanelShell>
  );
};
