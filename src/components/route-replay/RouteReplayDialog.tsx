import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import axios from "axios";
import { AlertTriangle, MapPinOff, Pause, Play, RefreshCw, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DispatcherButton } from "@/components/panel/DispatcherButton";
import { Skeleton } from "@/components/ui/skeleton";
import { apiService, type ApiRouteReplay } from "../../services/apiService";
import { apiErrorText } from "../../portals/sysadmin/lib/apiErrorText";
import { formatErrandId } from "../../utils/formatErrandId";
import { RouteReplayMap, riderColor } from "./RouteReplayMap";
import {
  formatDuration,
  formatMeters,
  positionAt,
  preparePoints,
  summaryOf,
  timeRange,
  timelineEvents,
  type ReplayEvent,
} from "./replayModel";

/**
 * Replays a rider's stored GPS trail for one errand (errand_track_points).
 *
 * Opened from the owner's Rider Performance report and from the dispatcher's
 * History detail and live inspector. The server decides who may see it (an
 * owner needs tracking.view; a dispatcher only their own claimed errands).
 *
 * `live` is for an errand still in progress: the trail refreshes every minute
 * and the playhead stays on the newest reading unless the viewer has moved it.
 */

const SPEEDS = [10, 30, 60] as const;
const LIVE_REFRESH_MS = 60_000;

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; title: string; detail: string; retryable: boolean }
  | { kind: "ready"; replay: ApiRouteReplay };

function describeError(err: unknown): { title: string; detail: string; retryable: boolean } {
  const status = axios.isAxiosError(err) ? err.response?.status : undefined;
  if (status === 403) {
    return {
      title: "You do not have access to this route",
      detail: apiErrorText(err, "Your account is not allowed to see this rider's movements."),
      retryable: false,
    };
  }
  if (status === 404) {
    return { title: "This errand was not found", detail: "It may have been removed.", retryable: false };
  }
  return { title: "Could not load the route", detail: apiErrorText(err, "Something went wrong. Try again."), retryable: true };
}

const clock = (t: number) => new Date(t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const clockSeconds = (t: number) =>
  new Date(t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
const dayAndClock = (t: number) =>
  new Date(t).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

interface RouteReplayDialogProps {
  errandId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Shown in the header before the server answers. */
  referenceNo?: string | null;
  live?: boolean;
}

export function RouteReplayDialog({ errandId, open, onOpenChange, referenceNo, live = false }: RouteReplayDialogProps) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(
    async (mode: "first" | "refresh") => {
      const id = ++requestRef.current;
      if (mode === "first") setState({ kind: "loading" });
      else setRefreshing(true);
      try {
        const replay = await apiService.getRouteReplay(errandId);
        if (id !== requestRef.current) return;
        setState({ kind: "ready", replay });
        setUpdatedAt(Date.now());
        setRefreshFailed(false);
      } catch (err) {
        if (id !== requestRef.current) return;
        // A failed background refresh keeps the trail already on screen.
        if (mode === "refresh") setRefreshFailed(true);
        else setState({ kind: "error", ...describeError(err) });
      } finally {
        if (id === requestRef.current) setRefreshing(false);
      }
    },
    [errandId]
  );

  useEffect(() => {
    if (!open) return;
    void load("first");
    return () => {
      requestRef.current += 1;
    };
  }, [open, load]);

  useEffect(() => {
    if (!open || !live) return;
    const timer = window.setInterval(() => void load("refresh"), LIVE_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [open, live, load]);

  const shownReference = state.kind === "ready" ? state.replay.errand?.referenceNo ?? referenceNo : referenceNo;

  return (
    <Dialog open={open} onOpenChange={(next) => onOpenChange(next)}>
      <DialogContent
        data-surface="dispatch"
        className="flex h-[calc(100dvh-2rem)] max-h-none w-full max-w-5xl flex-col space-y-0 overflow-hidden rounded-modal border-edge bg-board-plate p-0 md:h-auto md:max-h-[90dvh]"
      >
        <DialogHeader
          data-on-field
          className="flex shrink-0 flex-row items-start justify-between gap-3 border-b-0 bg-board-field px-4 py-3"
        >
          <div className="min-w-0">
            {/* Never truncated: the reference is what the reader came to check. */}
            <DialogTitle className="text-panel font-bold text-board-plate">
              Route replay{" "}
              <span className="block font-mono font-semibold sm:inline">
                {shownReference ?? formatErrandId(errandId)}
              </span>
            </DialogTitle>
            <DialogDescription className="text-label text-board-trim">
              {live
                ? "The trail so far, from the rider's stored GPS readings."
                : "Where the rider's phone recorded them, from the stored GPS readings."}
            </DialogDescription>
          </div>
          <DialogClose
            aria-label="Close the route replay"
            className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-trim text-board-trim transition-colors hover:bg-board-plate/10 hover:text-board-plate"
          >
            <X size={16} />
          </DialogClose>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {state.kind === "loading" && <ReplaySkeleton />}
          {state.kind === "error" && (
            <div className="grid place-items-center px-6 py-16 text-center">
              <AlertTriangle size={22} className="text-status-act-ink" aria-hidden="true" />
              <p className="mt-2 text-label font-semibold text-ink">{state.title}</p>
              <p className="mt-1 max-w-sm text-body text-ink-muted">{state.detail}</p>
              {state.retryable && (
                <DispatcherButton
                  variant="secondary"
                  size="sm"
                  className="mt-4"
                  icon={<RefreshCw size={14} />}
                  onClick={() => void load("first")}
                >
                  Try again
                </DispatcherButton>
              )}
            </div>
          )}
          {state.kind === "ready" && (
            <ReplayBody
              replay={state.replay}
              live={live}
              liveNote={
                live && updatedAt
                  ? refreshFailed
                    ? `Could not refresh at ${clock(Date.now())}. Showing the trail from ${clock(updatedAt)}.`
                    : `Trail updated ${clock(updatedAt)}. It can be up to a minute behind the live pin.`
                  : null
              }
              refreshing={refreshing}
              onRefresh={() => void load("refresh")}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReplaySkeleton() {
  return (
    <div className="space-y-3 p-4" aria-label="Loading the route" role="status">
      <Skeleton className="h-80 w-full rounded-lg" />
      <Skeleton className="h-9 w-full rounded-lg" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

interface ReplayBodyProps {
  replay: ApiRouteReplay;
  live: boolean;
  liveNote: string | null;
  refreshing: boolean;
  onRefresh: () => void;
}

function ReplayBody({ replay, live, liveNote, refreshing, onRefresh }: ReplayBodyProps) {
  const points = useMemo(() => preparePoints(replay.points), [replay.points]);
  const events = useMemo(() => timelineEvents(replay, points), [replay, points]);
  const range = useMemo(() => timeRange(points, events), [points, events]);
  const summary = useMemo(() => summaryOf(replay, points), [replay, points]);

  // Opens on the whole picture: the playhead at the end, every line drawn.
  const [currentTime, setCurrentTime] = useState<number>(() => range?.end ?? 0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(30);
  const [panTarget, setPanTarget] = useState<{ lat: number; lng: number; key: number } | null>(null);
  // Live: stay on the newest reading until the viewer moves the playhead.
  const followRef = useRef(true);

  useEffect(() => {
    if (!range) return;
    setCurrentTime((t) => {
      if (live && followRef.current) return range.end;
      return Math.min(range.end, Math.max(range.start, t));
    });
  }, [range, live]);

  // The frame loop reads the time from a ref: a state updater runs whenever
  // React renders, too late to decide here whether playback reached the end.
  const timeRef = useRef(currentTime);
  timeRef.current = currentTime;

  useEffect(() => {
    if (!playing || !range) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const next = Math.min(range.end, timeRef.current + (now - last) * speed);
      last = now;
      timeRef.current = next;
      setCurrentTime(next);
      if (next >= range.end) {
        setPlaying(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed, range]);

  const seek = useCallback(
    (t: number) => {
      followRef.current = false;
      if (range) setCurrentTime(Math.min(range.end, Math.max(range.start, t)));
    },
    [range]
  );

  const jumpTo = (event: ReplayEvent) => {
    setPlaying(false);
    seek(event.at);
    const stop = event.stopId !== undefined ? replay.stops.find((s) => s.id === event.stopId) : undefined;
    const target = stop
      ? { lat: stop.latitude, lng: stop.longitude }
      : event.kind === "delivered" &&
          typeof replay.errand?.deliveryLatitude === "number" &&
          typeof replay.errand?.deliveryLongitude === "number"
        ? { lat: replay.errand.deliveryLatitude, lng: replay.errand.deliveryLongitude }
        : (() => {
            const p = positionAt(points, event.at);
            return p ? { lat: p.lat, lng: p.lng } : null;
          })();
    if (target) setPanTarget({ ...target, key: Date.now() });
  };

  const togglePlay = () => {
    if (!range) return;
    if (!playing && currentTime >= range.end) setCurrentTime(range.start);
    followRef.current = false;
    setPlaying((p) => !p);
  };

  const riderNames = useMemo(() => {
    const ids: Array<number | null> = [];
    for (const p of points) if (!ids.includes(p.riderId)) ids.push(p.riderId);
    return ids.map((id, i) => ({
      id,
      color: riderColor(i),
      name: replay.riders.find((r) => r.id === id)?.name ?? (id === null ? "Rider" : `Rider ${id}`),
    }));
  }, [points, replay.riders]);

  if (points.length === 0) {
    return (
      <div className="px-6 py-12">
        <div className="mx-auto max-w-md text-center">
          <MapPinOff size={22} className="mx-auto text-ink-muted" aria-hidden="true" />
          <p className="mt-2 text-label font-semibold text-ink">No GPS trail was recorded for this errand</p>
          <p className="mt-1 text-body text-ink-muted">
            The rider app stores a reading every minute while an errand is active. None arrived for this one: the app
            may have been closed or without location permission, or the errand is older than trail uploads.
          </p>
          {live && (
            <DispatcherButton
              variant="secondary"
              size="sm"
              className="mt-4"
              loading={refreshing}
              icon={<RefreshCw size={14} />}
              onClick={onRefresh}
            >
              Check again
            </DispatcherButton>
          )}
        </div>
        {events.length > 0 && (
          <div className="mx-auto mt-8 max-w-md">
            <h3 className="text-micro font-semibold uppercase tracking-[0.06em] text-ink-muted">
              What the errand record shows
            </h3>
            <ol className="mt-2 divide-y divide-hairline rounded-lg border border-edge">
              {events.map((e, i) => (
                <li key={`${e.kind}-${i}`} className="flex items-baseline justify-between gap-3 px-3 py-2">
                  <span className="text-body text-ink">{e.label}</span>
                  <span className="shrink-0 font-mono text-micro text-ink-muted">{dayAndClock(e.at)}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    );
  }

  const facts: Array<{ label: string; value: string }> = [
    { label: "GPS readings", value: String(summary.count) },
    {
      label: "Recorded",
      value:
        summary.firstAt !== null && summary.lastAt !== null
          ? `${clock(summary.firstAt)} to ${clock(summary.lastAt)}`
          : "-",
    },
    { label: "Distance along readings", value: formatMeters(summary.trailKm * 1000) },
    {
      label: "Snapped to roads",
      value: summary.mapMatchedShare === null ? "-" : `${Math.round(summary.mapMatchedShare * 100)}%`,
    },
    { label: "Sent late after signal loss", value: String(summary.offlineCount) },
    { label: "GPS gaps over 3 min", value: String(summary.gapCount) },
    {
      label: "Closest to the door at delivery",
      value: summary.nearestToDoorMeters === null ? "Not checked" : formatMeters(summary.nearestToDoorMeters),
    },
  ];

  const progress = range && range.end > range.start ? (currentTime - range.start) / (range.end - range.start) : 1;

  return (
    <div className="flex flex-col gap-3 p-4">
      {replay.truncated && (
        <p className="rounded-lg border border-edge bg-board-ground px-3 py-2 text-label text-ink">
          Showing the first {summary.count.toLocaleString()} readings. The rest of this trail is not drawn.
        </p>
      )}
      {liveNote && (
        <p className="flex items-center gap-2 text-micro text-ink-muted" role="status">
          {refreshing && <RefreshCw size={12} className="animate-spin" aria-hidden="true" />}
          {liveNote}
        </p>
      )}

      <RouteReplayMap
        replay={replay}
        points={points}
        currentTime={currentTime}
        panTarget={panTarget}
        onSeek={(t) => {
          setPlaying(false);
          seek(t);
        }}
        heightClass="h-[42dvh] min-h-64 md:h-96"
      />

      {/* Playback */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <DispatcherButton
          variant="field"
          size="sm"
          iconOnly
          aria-label={playing ? "Pause" : "Play"}
          icon={playing ? <Pause size={15} /> : <Play size={15} />}
          onClick={togglePlay}
        />
        <div className="min-w-0 flex-1 basis-48">
          <input
            type="range"
            aria-label="Replay time"
            className="w-full accent-[#1E3A5F]"
            min={range?.start ?? 0}
            max={range?.end ?? 0}
            step={1000}
            value={currentTime}
            onChange={(e) => {
              setPlaying(false);
              seek(Number(e.target.value));
            }}
          />
          <div className="flex justify-between font-mono text-micro text-ink-muted">
            <span>{range ? clock(range.start) : ""}</span>
            <span className="font-semibold text-ink" aria-live="off">
              {clockSeconds(currentTime)}
            </span>
            <span>{range ? clock(range.end) : ""}</span>
          </div>
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Playback speed">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={speed === s}
              onClick={() => setSpeed(s)}
              className={cn(
                "min-h-9 cursor-pointer rounded-trim px-2.5 font-mono text-micro font-semibold transition-colors",
                speed === s ? "bg-board-field text-white" : "bg-board-ground text-ink hover:bg-board-trim/25"
              )}
            >
              {s}x
            </button>
          ))}
        </div>
        {progress < 1 && !playing && (
          <DispatcherButton
            variant="subtle"
            size="sm"
            icon={<RotateCcw size={14} />}
            onClick={() => {
              followRef.current = live;
              if (range) setCurrentTime(range.end);
            }}
          >
            {live ? "Back to newest" : "Show all"}
          </DispatcherButton>
        )}
      </div>

      <Legend riders={riderNames} />

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section>
          <h3 className="text-micro font-semibold uppercase tracking-[0.06em] text-ink-muted">Timeline</h3>
          <ol className="mt-2 max-h-64 divide-y divide-hairline overflow-y-auto rounded-lg border border-edge">
            {events.map((e, i) => {
              const past = e.at <= currentTime;
              return (
                <li key={`${e.kind}-${i}`}>
                  <button
                    type="button"
                    onClick={() => jumpTo(e)}
                    className="flex w-full cursor-pointer items-baseline justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-board-ground"
                  >
                    <span
                      className={cn(
                        "min-w-0 break-words text-body",
                        past ? "text-ink" : "text-ink-muted",
                        e.kind === "delivered" && "font-semibold",
                        e.kind === "gap" && "italic"
                      )}
                    >
                      {e.label}
                    </span>
                    <span className="shrink-0 font-mono text-micro text-ink-muted">{clock(e.at)}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
        <section>
          <h3 className="text-micro font-semibold uppercase tracking-[0.06em] text-ink-muted">From the readings</h3>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2.5">
            {facts.map((f) => (
              <div key={f.label} className="min-w-0">
                <dt className="text-micro text-ink-muted">{f.label}</dt>
                <dd data-figure className="font-mono text-body font-semibold tabular-nums text-ink">
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>
          {summary.gapCount > 0 && (
            <p className="mt-3 text-micro text-ink-muted">
              Dashed lines are gaps of {formatDuration(3)} or more with no reading. They show where the trail resumed,
              not the road taken.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function Legend({ riders }: { riders: Array<{ id: number | null; color: string; name: string }> }) {
  const item = (swatch: ReactNode, label: string, key: string) => (
    <li key={key} className="flex items-center gap-1.5">
      {swatch}
      <span>{label}</span>
    </li>
  );
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-micro text-ink-muted" aria-label="Map legend">
      {riders.map((r) =>
        item(
          <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: r.color }} aria-hidden="true" />,
          r.name,
          `rider-${r.id}`
        )
      )}
      {item(
        <span className="inline-block size-2.5 rounded-full border-2 border-[#1E3A5F]" aria-hidden="true" />,
        "Sent late after signal loss",
        "offline"
      )}
      {item(
        <span className="inline-block size-2.5 rounded-full border-2 border-[#B45309] bg-[#1E3A5F]" aria-hidden="true" />,
        "Raw GPS, not snapped",
        "raw"
      )}
      {item(<span className="inline-block w-4 border-t-2 border-dashed border-[#64748B]" aria-hidden="true" />, "No GPS", "gap")}
      {item(<span className="inline-block h-1 w-4 rounded-sm bg-[#94A3B8]" aria-hidden="true" />, "Priced route", "priced")}
      {item(<span className="inline-block size-2.5 rounded-full bg-[#E53935]" aria-hidden="true" />, "Delivery address", "door")}
    </ul>
  );
}
