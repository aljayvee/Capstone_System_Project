import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router";
import { io, Socket } from "socket.io-client";
import { ref, set } from "firebase/database";
import { database } from "../../../firebase/config";
import { postUnderReview, postAccepted, postDeclined } from "../../../services/chatSystemMessages";
import { ErrandService } from "../../../services/errandService";
import { getMemoryAccessToken } from "../../../services/apiClient";
import { Errand, ErrandStatus } from "../../../types/errand";
import { apiClient } from "../../../services/apiClient";

const BACKEND_URL = (import.meta as any).env?.VITE_API_URL
  ? (import.meta as any).env.VITE_API_URL.replace(/\/api$/, "")
  : "http://localhost:5000";

type DispatcherTab =
  | "queue"
  | "active_errands"
  | "exceptions"
  | "riders"
  | "recent_chats"
  | "messages"
  | "profile";
const TAB_IDS: DispatcherTab[] = [
  "queue",
  "active_errands",
  "exceptions",
  "riders",
  "recent_chats",
  "messages",
  "profile",
];

// Map the strict Prisma Errand object to the frontend Errand interface
function mapPrismaErrand(prismaErrand: any): Errand {
  return {
    id: prismaErrand.id,
    customerName: prismaErrand.customer?.name || "Customer",
    customerPhone: prismaErrand.customer?.phone || "09123456789",
    category: prismaErrand.category,
    description: prismaErrand.description,
    pickupAddress: prismaErrand.pickupAddress,
    deliveryAddress: prismaErrand.deliveryAddress,
    deliveryLatitude: prismaErrand.deliveryLatitude != null ? Number(prismaErrand.deliveryLatitude) : null,
    deliveryLongitude: prismaErrand.deliveryLongitude != null ? Number(prismaErrand.deliveryLongitude) : null,
    pinpoints: prismaErrand.pinpoints || [],
    pabiliDetails: prismaErrand.pabiliDetails || [],
    pabiliItemRequests: prismaErrand.pabiliItemRequests || [],
    storeCount: prismaErrand.storeCount,
    distanceKm: prismaErrand.distanceKm != null ? Number(prismaErrand.distanceKm) : null,
    routeDistanceMeters: prismaErrand.routeDistanceMeters,
    routeDurationSeconds: prismaErrand.routeDurationSeconds,
    routeGeometry: prismaErrand.routeGeometry,
    routeProvider: prismaErrand.routeProvider,
    etaLowAt: prismaErrand.etaLowAt,
    etaHighAt: prismaErrand.etaHighAt,
    etaComputedAt: prismaErrand.etaComputedAt,
    etaIsDegraded: Boolean(prismaErrand.etaIsDegraded),
    estimatedCost: Number(prismaErrand.estimatedCost || 0),
    deliveryFee: Number(prismaErrand.deliveryFee || 0),
    tip: Number(prismaErrand.tip || 0),
    totalCost: Number(prismaErrand.totalCost || 0),
    status: prismaErrand.status,
    dispatcherId: prismaErrand.dispatchLogs?.[0]?.dispatcherId,
    dispatcherName: prismaErrand.dispatchLogs?.[0]?.dispatcher?.name,
    dispatchLogs: prismaErrand.dispatchLogs || [],
    riderId: prismaErrand.riderId,
    riderName: prismaErrand.rider?.name,
    createdAt: prismaErrand.createdAt,
    updatedAt: prismaErrand.updatedAt,
  };
}

// An errand is visible to this dispatcher if it's still unclaimed (AVAILABLE,
// shown to everyone) or if this dispatcher is the one who claimed it — mirrors
// the backend's findManyForDispatcher scoping, applied to live Socket.io
// broadcasts too (those are global, unscoped io.emit() calls server-side, so
// without this a claim by another dispatcher would otherwise still show up here).
function isVisibleToDispatcher(errand: Errand, dispatcherId?: number): boolean {
  if (String(errand.status).toUpperCase() === "AVAILABLE") return true;
  if (!dispatcherId) return false;
  return String(errand.dispatcherId) === String(dispatcherId);
}

export function useDispatcherPortal(currentUserId?: number, currentUserName?: string) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [errands, setErrands] = useState<Errand[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const requestedTab = searchParams.get("tab");
  const activeTab: DispatcherTab = TAB_IDS.includes(requestedTab as DispatcherTab)
    ? (requestedTab as DispatcherTab)
    : "queue";
  const selectedErrandId = searchParams.get("errand");

  const setActiveTab = (tab: DispatcherTab) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", tab);
        return next;
      },
      { replace: true }
    );
  };

  const setSelectedErrandId = (id: string | null) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (id) {
          next.set("errand", id);
        } else {
          next.delete("errand");
        }
        return next;
      },
      { replace: true }
    );
  };

  const fetchOrders = useCallback(async () => {
    try {
      const res = await apiClient.get("/errands");
      const mapped = (res.data || []).map(mapPrismaErrand);
      setErrands(mapped);
    } catch (err) {
      console.warn("Failed to fetch errands:", err);
    }
  }, []);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      await fetchOrders();
      setIsLoading(false);
    }
    loadData();

    // Socket.io real-time connection.
    //
    // Authenticated now: the server scopes private events (a rider's position,
    // an ETA) to identified clients and joins staff into a role room on connect.
    // An anonymous socket still receives the legacy broadcast events, but would
    // silently miss everything scoped.
    const socket: Socket = io(BACKEND_URL, {
      auth: { token: getMemoryAccessToken() ?? undefined },
    });

    socket.on("order:new", (newOrder: any) => {
      console.log("[Socket.io] Received order:new:", newOrder);
      const errand = mapPrismaErrand(newOrder);
      setErrands((prev) => [errand, ...prev.filter((e) => e.id !== errand.id)]);
    });

    socket.on("order:claimed", (claimedOrder: any) => {
      console.log("[Socket.io] Received order:claimed:", claimedOrder);
      const errand = mapPrismaErrand(claimedOrder);
      setErrands((prev) =>
        isVisibleToDispatcher(errand, currentUserId)
          ? prev.map((e) => (e.id === errand.id ? errand : e))
          : prev.filter((e) => e.id !== errand.id)
      );
    });

    socket.on("order:updated", (updatedOrder: any) => {
      const errand = mapPrismaErrand(updatedOrder);
      setErrands((prev) =>
        isVisibleToDispatcher(errand, currentUserId)
          ? prev.map((e) => (e.id === errand.id ? errand : e))
          : prev.filter((e) => e.id !== errand.id)
      );
    });

    // Live ETA. Patched onto the errand already in state rather than refetching:
    // this fires whenever the rider moves materially, and the payload carries
    // everything the queue's ETA column renders.
    socket.on("errand:eta_updated", (payload: any) => {
      if (!payload?.errandId) return;
      setErrands((prev) =>
        prev.map((e) =>
          e.id === payload.errandId
            ? {
                ...e,
                etaLowAt: payload.etaLowAt,
                etaHighAt: payload.etaHighAt,
                etaIsDegraded: Boolean(payload.degraded),
              }
            : e
        )
      );
    });

    // A rider queueing far longer than that store type usually takes. Surfaced
    // to the dispatcher at the same moment as the customer, so the two are never
    // working from different information when the customer calls to ask.
    socket.on("errand:stop_delayed", (payload: any) => {
      if (!payload?.errandId) return;
      console.info(
        `[Dispatch] Errand ${payload.errandId} delayed at ${payload.storeName}: ` +
          `${Math.round((payload.elapsedSeconds ?? 0) / 60)} min elapsed vs ~${Math.round((payload.typicalSeconds ?? 0) / 60)} min typical.`
      );
    });

    // The rider settled at a catalogue place that is not the pinned stop — the
    // wrong branch of a chain, which the geofence cannot see because the two
    // branches are further apart than its radius. Dispatcher-only on purpose:
    // the customer can do nothing with this, but dispatch can call the rider
    // before the errand finishes against the wrong store.
    // The rider's confirmed receipt total is far from what OCR read. Small
    // corrections are silent by design — OCR misreads a digit on creased thermal
    // paper routinely, and alerting on those trains dispatch to ignore the alert.
    // This only fires past ₱100 or 20%, whichever is greater.
    socket.on("errand:receipt_mismatch", (payload: any) => {
      if (!payload?.errandId) return;
      console.warn(
        `[Dispatch] Errand ${payload.errandId}: rider entered ₱${payload.confirmedTotal} but the ` +
          `receipt scanned as ₱${payload.extractedTotal} (₱${payload.gap} apart). Worth a call before it settles.`
      );
    });

    // A purchase from a shop that issues no receipt — a sari-sari store, a market
    // stall. The amount is the rider's word and nothing corroborates it, so it is
    // surfaced as it happens rather than found in a report a week later. Not an
    // accusation: it is the ordinary way half of Tacurong sells things, and the
    // point is that dispatch knows which purchases carry no paper behind them.
    socket.on("errand:unverified_purchase", (payload: any) => {
      if (!payload?.errandId) return;
      console.warn(
        `[Dispatch] Errand ${payload.errandId}: rider ${payload.riderId} declared ` +
          `₱${payload.declaredTotal} at a shop that issued no receipt. Unverified — ` +
          `the photo shows the goods, not a printed total.`
      );
    });

    socket.on("errand:stop_mismatch", (payload: any) => {
      if (!payload?.errandId) return;
      console.warn(
        `[Dispatch] Errand ${payload.errandId}: rider is at "${payload.observedPlaceName}", ` +
          `but the stop is pinned to "${payload.pinnedStoreName}" ` +
          `(${payload.metersFromPinnedStop} m away).`
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchOrders, currentUserId]);

  const handleClaimOrder = async (orderId: string, currentUser: any) => {
    const dispatcherFirstName = currentUser?.name ? currentUser.name.split(" ")[0] : "Dispatcher";
    const dispatcherId = currentUser?.id || 1;

    try {
      const res = await apiClient.patch(`/errands/${orderId}/claim`);

      // Write meta info to Firebase Realtime Database
      try {
        await set(ref(database, `chats/${orderId}/meta`), {
          dispatcherId,
          dispatcherName: dispatcherFirstName,
          claimedAt: Date.now(),
        });
      } catch (fbErr) {
        console.warn("Firebase RTDB meta write warning:", fbErr);
      }

      // Introduce the dispatcher in the conversation. Until now claiming an
      // errand only wrote a `meta` node, so the chat the customer was pushed
      // into opened completely empty — the least reassuring possible result of
      // "your errand was accepted".
      void postAccepted(orderId, currentUser?.name || dispatcherFirstName);

      // Open slide-in chat drawer
      setSelectedErrandId(orderId);
      fetchOrders();
    } catch (err: any) {
      if (err.response?.status === 409) {
        alert(err.response.data.error || "This order was already accepted.");
        fetchOrders();
      } else {
        alert(err.response?.data?.error || err.message || "Failed to claim order");
      }
    }
  };

  const handleOpenChat = (orderId: string) => {
    setSelectedErrandId(orderId);
  };

  const handleCloseChat = () => {
    setSelectedErrandId(null);
  };

  const handleUpdateStatus = async (errandId: string, targetStatus: ErrandStatus) => {
    try {
      const res = await apiClient.patch(`/errands/${errandId}/status`, { status: targetStatus });
      setErrands((prev) =>
        prev.map((e) => (e.id === errandId ? { ...e, status: targetStatus } : e))
      );
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || "Failed to update status");
      // Fallback update if needed
      const updated = await ErrandService.updateErrandStatus(errandId, targetStatus);
      setErrands((prev) => prev.map((e) => (e.id === errandId ? updated : e)));
    }
  };

  const handleDeclineOrder = async (orderId: string, reason?: string) => {
    const finalReason = (reason || "").trim() || "Declined during dispatcher review";
    try {
      // The dedicated endpoint, not PATCH /status. The old call passed `reason`
      // to a handler that only reads `status`, so every explanation a
      // dispatcher wrote was silently discarded and the customer was left with
      // a cancelled errand and no idea why. This one persists it to
      // `errand_decline_reasons` and notifies the customer.
      await apiClient.patch(`/errands/${orderId}/dispatcher-decline`, { reason: finalReason });

      void postDeclined(orderId, finalReason, currentUserName);
      setErrands((prev) =>
        prev.map((e) => (e.id === orderId ? { ...e, status: "Cancelled" as ErrandStatus } : e))
      );
      fetchOrders();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || "Failed to decline order");
    }
  };

  return {
    activeTab,
    setActiveTab,
    errands,
    isLoading,
    selectedErrandId,
    fetchOrders,
    handleClaimOrder,
    handleDeclineOrder,
    handleOpenChat,
    handleCloseChat,
    handleUpdateStatus,
  };
}
