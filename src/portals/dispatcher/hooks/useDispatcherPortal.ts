import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import { ref, set } from "firebase/database";
import { database } from "../../../firebase/config";
import { postAccepted, postDeclined } from "../../../services/chatSystemMessages";
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
    // Empty, never a placeholder number. This defaulted to "09123456789",
    // which is a dialable Philippine mobile number that a dispatcher chasing a
    // stalled run would have had no way to tell apart from a real one. It also
    // defeated every display-level fallback downstream, since the field was
    // always truthy by the time a panel saw it.
    customerPhone: prismaErrand.customer?.phone || "",
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
    // The payment mode the customer confirmed, and where the money stands.
    //
    // This mapper is an explicit allow-list, not a spread — anything not named
    // here is silently dropped before any dispatcher component sees it. That is
    // deliberate and worth keeping, but it means a new server field reaches the
    // UI only when it is added here too. The inspector's fee note read
    // "Payment mode not chosen yet" on an errand that plainly had one, for
    // exactly this reason.
    paymentSelection: prismaErrand.paymentSelection ?? null,
    paymentPlan: prismaErrand.paymentPlan ?? null,
    quotedHandlingBasket:
      prismaErrand.quotedHandlingBasket != null ? Number(prismaErrand.quotedHandlingBasket) : null,
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
  // Why these exist: `isLoading` was computed and returned here from the start,
  // and the portal never destructured it, so every panel rendered its empty
  // state during the first fetch as though the data were confirmed empty. And
  // `fetchOrders` caught its own failure with a console.warn and left `errands`
  // at [], so a dead API and a quiet shift were indistinguishable: the console
  // answered both with "All Caught Up" under a green check. A failure is now a
  // state a panel can render, and PanelState orders it ahead of empty.
  const [loadError, setLoadError] = useState<string | null>(null);
  // Failed mutations used to surface through `alert()`, a blocking browser
  // dialog that is not in-context recovery and cannot be styled or read by the
  // panel that caused it.
  const [actionError, setActionError] = useState<string | null>(null);

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

  // Read by socket handlers registered once per connection, which would
  // otherwise see the errand list and the router setter from their first render.
  const errandsRef = useRef<Errand[]>(errands);
  errandsRef.current = errands;
  const openErrandRef = useRef(setSelectedErrandId);
  openErrandRef.current = setSelectedErrandId;

  const fetchOrders = useCallback(async () => {
    try {
      const res = await apiClient.get("/errands");
      const mapped = (res.data || []).map(mapPrismaErrand);
      setErrands(mapped);
      setLoadError(null);
    } catch (err) {
      console.warn("Failed to fetch errands:", err);
      // The existing list is left alone on purpose. A dispatcher reading a
      // stale board beside an explicit warning is better served than one
      // reading an empty board that looks like a finished shift.
      setLoadError(
        "The dispatch service did not answer. The board may be out of date, and new orders may not be showing."
      );
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
          `₱${payload.declaredTotal} at a shop that issued no receipt. Unverified: ` +
          `the photo shows the goods, not a printed total.`
      );
    });

    // A rider holding every item, standing still until the customer's 50% lands.
    // Loud on purpose, and it stays up until handled: it is the one point in the
    // flow where someone on the road is waiting on dispatch. Skipped only for an
    // errand this list shows another dispatcher owns; the one who claimed it is
    // the one who can open that chat.
    socket.on("errand:half_payment_requested", (payload: any) => {
      if (!payload?.errandId) return;
      const known = errandsRef.current.find((e) => e.id === payload.errandId);
      if (known?.dispatcherId && currentUserId && String(known.dispatcherId) !== String(currentUserId)) {
        return;
      }
      const who = payload.customerName || "The customer";
      const amount = `₱${Number(payload.dueUpFront ?? 0).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
      toast.warning(`${who} needs to send the half-payment`, {
        id: `half-payment-${payload.errandId}`,
        description: `${payload.riderName || "The rider"} has every item and is waiting. Ask ${who} for ${amount} in the chat.`,
        duration: Infinity,
        action: {
          label: "Open chat",
          onClick: () => openErrandRef.current(payload.errandId),
        },
      });
    });

    // Settled, by the receipt or by hand: the alert has done its job.
    socket.on("errand:payment_updated", (payload: any) => {
      if (payload?.errandId && payload.reason === "upfront_confirmed") {
        toast.dismiss(`half-payment-${payload.errandId}`);
      }
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
      await apiClient.patch(`/errands/${orderId}/claim`);

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
      // Deliberately NOT postAccepted here any more.
      //
      // Claiming now means "opened for review", not "accepted". Greeting the
      // customer with "I've reviewed your order and it's good to go" before
      // anyone has checked a single item was a promise the dispatcher had not
      // made yet — and could not keep if the shop turned out to be out of stock.
      // The queue posts the under-review line instead, and postAccepted moves to
      // handleVerifyErrand below, where it is finally true.

      fetchOrders();
    } catch (err: any) {
      // Rethrown, not alerted. The caller opens a customer-facing chat on
      // success, so it has to be able to tell success from failure — swallowing
      // the 409 here would drop a second dispatcher into a conversation the
      // first one already owns.
      fetchOrders();
      throw err;
    }
  };

  /**
   * The dispatcher has checked the items with the customer and is taking it on.
   *
   * This is where the customer is finally told who their dispatcher is, because
   * this is the first moment it is true.
   */
  const handleVerifyErrand = async (orderId: string, currentUser: any) => {
    const dispatcherFirstName = currentUser?.name ? currentUser.name.split(" ")[0] : "Dispatcher";
    await apiClient.patch(`/errands/${orderId}/verify`);
    void postAccepted(orderId, currentUser?.name || dispatcherFirstName);
    fetchOrders();
  };

  /** Hands a request back to the queue without cancelling it on the customer. */
  const handleReleaseErrand = async (orderId: string) => {
    await apiClient.patch(`/errands/${orderId}/release`);
    setSelectedErrandId(null);
    fetchOrders();
  };

  const handleOpenChat = (orderId: string) => {
    setSelectedErrandId(orderId);
  };

  const handleCloseChat = () => {
    setSelectedErrandId(null);
  };

  const handleUpdateStatus = async (errandId: string, targetStatus: ErrandStatus) => {
    setActionError(null);
    try {
      await apiClient.patch(`/errands/${errandId}/status`, { status: targetStatus });
      setErrands((prev) =>
        prev.map((e) => (e.id === errandId ? { ...e, status: targetStatus } : e))
      );
    } catch (err: any) {
      // The old path alerted and then, after the alert, called
      // ErrandService.updateErrandStatus unguarded as a "fallback". That is a
      // second write attempt against a status change that had just failed, it
      // could throw again with nothing to catch it, and it ran whether or not
      // the first failure was retryable. The failure is now reported in
      // context and the state is left as the server last described it.
      setActionError(
        err?.response?.data?.error ||
          err?.message ||
          `This run could not be moved to ${targetStatus}. It may have been changed by someone else.`
      );
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
      setActionError(
        err?.response?.data?.error ||
          err?.message ||
          "This run could not be declined. The customer has not been told anything, so it is safe to try again."
      );
    }
  };

  return {
    activeTab,
    setActiveTab,
    errands,
    isLoading,
    /** Set when the board could not be loaded. Outranks "empty" everywhere. */
    loadError,
    /** Set when a claim, status change or decline failed. Replaces alert(). */
    actionError,
    dismissActionError: () => setActionError(null),
    selectedErrandId,
    fetchOrders,
    handleClaimOrder,
    handleVerifyErrand,
    handleReleaseErrand,
    handleDeclineOrder,
    handleOpenChat,
    handleCloseChat,
    handleUpdateStatus,
  };
}
