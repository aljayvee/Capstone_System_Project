import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient } from "../../../../../services/apiClient";
import { formatErrandId } from "../../../../../utils/formatErrandId";
import type { PanelError, StorePinpoint, MerchantCategory } from "../types";

interface UseOrderDetailsResult {
  orderDetails: any;
  setOrderDetails: (next: any) => void;
  panelError: PanelError | null;
  /** Pins hydrated from the server on load. Owned by useStorePins afterwards. */
  initialPinpoints: StorePinpoint[] | null;
  merchantCategories: MerchantCategory[];
  rateConfig: any;
  /** Deliberate re-read after an action this screen performed. */
  refresh: () => void;
}

/**
 * Fetches the errand, guards access to it, and loads the two reference lists
 * the stages need (merchant categories, rate config).
 */
export function useOrderDetails(orderId: string, dispatcher: any): UseOrderDetailsResult {
  // Read inside the fetch effect without being one of its triggers — see the
  // long note on the effect below for why this matters.
  const dispatcherRef = useRef(dispatcher);
  dispatcherRef.current = dispatcher;

  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [panelError, setPanelError] = useState<PanelError | null>(null);
  const [initialPinpoints, setInitialPinpoints] = useState<StorePinpoint[] | null>(null);
  const [merchantCategories, setMerchantCategories] = useState<MerchantCategory[]>([]);
  const [rateConfig, setRateConfig] = useState<any>(null);

  const [detailsToken, setDetailsToken] = useState(0);
  const refresh = useCallback(() => setDetailsToken((n) => n + 1), []);

  useEffect(() => {
    async function loadRateConfig() {
      try {
        const res = await apiClient.get("/rate-config");
        if (res.data) setRateConfig(res.data);
      } catch (err) {
        console.warn("Failed to load rate config:", err);
      }
    }
    async function loadMerchantCategories() {
      try {
        const res = await apiClient.get<any[]>("/merchant-categories");
        if (Array.isArray(res.data)) {
          setMerchantCategories(res.data.filter((c) => !c.status || c.status === "Active"));
        }
      } catch (err) {
        console.warn("Failed to load merchant categories:", err);
      }
    }
    loadRateConfig();
    loadMerchantCategories();
  }, []);

  useEffect(() => {
    async function fetchOrderInfo() {
      try {
        const res = await apiClient.get(`/errands/${orderId}`);
        const errandData = res.data?.errand || res.data || null;

        if (!errandData) {
          setPanelError({
            variant: "not_found",
            reason: `The requested errand with reference ID #${formatErrandId(orderId)} does not exist.`,
          });
          return;
        }

        // Front-end authorization check: this dispatcher vs. whoever holds it.
        const currentRole = String(dispatcherRef.current?.role || "").toLowerCase();
        if (
          currentRole === "dispatcher" &&
          errandData?.dispatcherId &&
          dispatcherRef.current?.id &&
          String(errandData.dispatcherId) !== String(dispatcherRef.current.id)
        ) {
          const claimant = errandData.dispatcherName || "another dispatcher";
          setPanelError({
            variant: "unauthorized",
            claimantName: claimant,
            reason: `This errand transaction is currently claimed and being handled by ${claimant}.`,
          });
          return;
        }

        setOrderDetails(errandData);

        if (Array.isArray(errandData?.pinpoints) && errandData.pinpoints.length > 0) {
          // Carry the catalogue identity back in too, or reopening an errand and
          // re-saving its pins would quietly strip what the dispatcher had
          // already chosen.
          setInitialPinpoints(
            errandData.pinpoints.map((p: any) => ({
              id: p.id,
              storeName: p.storeName || p.name || "Store",
              latitude: Number(p.latitude ?? p.lat),
              longitude: Number(p.longitude ?? p.lng),
              placeId: p.placeId ?? null,
              categoryId: p.categoryId ?? null,
            }))
          );
        } else {
          setInitialPinpoints([]);
        }
      } catch (err: any) {
        if (err.response?.status === 403) {
          setPanelError({
            variant: "unauthorized",
            claimantName: "Assigned Dispatcher",
            reason:
              err.response?.data?.error ||
              err.response?.data?.message ||
              "You do not have permission to view or manage this errand.",
          });
          return;
        }
        setPanelError({
          variant: "not_found",
          reason:
            err.response?.data?.error ||
            err.response?.data?.message ||
            `Errand reference #${formatErrandId(orderId)} was not found.`,
        });
      }
    }
    if (orderId) fetchOrderInfo();

    // Deliberately just [orderId, detailsToken] — this fetch re-hydrates pins
    // and everything derived from orderDetails from whatever is LAST SAVED on
    // the server, discarding any local edit made since. `dispatcher` is read
    // via a ref rather than being a dependency precisely so a parent handing
    // down a fresh (unmemoized) object every render can't retrigger it.
    //
    // That was a real bug, not a hypothetical: DispatcherPortal's handlers are
    // plain functions recreated every render. With one in this array, any
    // unrelated re-render of the portal — a chat message arriving, a socket
    // tick — refired the fetch mid-edit, and a dispatcher who removed a pin and
    // dropped a new one watched the new pin vanish and the old one reappear.
    //
    // `detailsToken` is the one sanctioned way back in: a counter this screen
    // bumps deliberately, after an action it performed itself.
  }, [orderId, detailsToken]);

  return {
    orderDetails,
    setOrderDetails,
    panelError,
    initialPinpoints,
    merchantCategories,
    rateConfig,
    refresh,
  };
}
