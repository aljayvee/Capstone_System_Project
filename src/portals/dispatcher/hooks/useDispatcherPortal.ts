import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router";
import { io, Socket } from "socket.io-client";
import { ref, set } from "firebase/database";
import { database } from "../../../firebase/config";
import { ErrandService, MockRider } from "../../../services/errandService";
import { Errand, ErrandStatus } from "../../../types/errand";
import { apiClient } from "../../../services/apiClient";

const BACKEND_URL = (import.meta as any).env?.VITE_API_URL
  ? (import.meta as any).env.VITE_API_URL.replace(/\/api$/, "")
  : "http://localhost:5000";

type DispatcherTab = "queue" | "riders" | "recent_chats";
const TAB_IDS: DispatcherTab[] = ["queue", "riders", "recent_chats"];

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
    estimatedCost: prismaErrand.estimatedCost,
    deliveryFee: prismaErrand.deliveryFee,
    tip: prismaErrand.tip,
    totalCost: prismaErrand.totalCost,
    status: prismaErrand.status,
    dispatcherId: prismaErrand.dispatchLogs?.[0]?.dispatcherId,
    dispatcherName: prismaErrand.dispatchLogs?.[0]?.dispatcher?.name,
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

export function useDispatcherPortal(currentUserId?: number) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [errands, setErrands] = useState<Errand[]>([]);
  const [riders, setRiders] = useState<MockRider[]>([]);
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
      try {
        const ridersRes = await apiClient.get("/riders");
        const riderList = Array.isArray(ridersRes.data)
          ? ridersRes.data
          : ridersRes.data?.riders || [];
        setRiders(riderList);
      } catch (err) {
        console.error("Failed to load riders:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();

    // Socket.io Real-Time Persistent Connection
    const socket: Socket = io(BACKEND_URL);

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

  return {
    activeTab,
    setActiveTab,
    errands,
    riders,
    isLoading,
    selectedErrandId,
    fetchOrders,
    handleClaimOrder,
    handleOpenChat,
    handleCloseChat,
    handleUpdateStatus,
  };
}
