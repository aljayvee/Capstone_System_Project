import { useState, useEffect, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { ref, set } from "firebase/database";
import { database } from "../../../firebase/config";
import { ErrandService, MockRider } from "../../../services/errandService";
import { Errand, ErrandStatus } from "../../../types/errand";

const BACKEND_URL = (import.meta as any).env?.VITE_API_URL
  ? (import.meta as any).env.VITE_API_URL.replace(/\/api$/, "")
  : "http://localhost:5000";

function mapOrderToErrand(rawOrder: any): Errand {
  return {
    id: rawOrder.orderId || `ERR-${rawOrder.id}`,
    customerName: rawOrder.customerName || "Customer",
    customerPhone: rawOrder.customerPhone || "09123456789",
    category: rawOrder.categories || "Pabili",
    description: typeof rawOrder.items === "string" ? rawOrder.items : JSON.stringify(rawOrder.items || {}),
    pickupAddress: rawOrder.categories || "Store",
    deliveryAddress: rawOrder.deliveryAddress || "Tacurong City",
    estimatedCost: parseFloat(rawOrder.totalPurchaseAmount) || 0,
    deliveryFee: (parseFloat(rawOrder.baseFee) || 70) + (parseFloat(rawOrder.distanceFee) || 10),
    tip: 0,
    totalCost: parseFloat(rawOrder.grandTotal) || 80,
    status: rawOrder.status === "PENDING" ? "Pending" : rawOrder.status,
    dispatcherId: rawOrder.dispatcherId,
    dispatcherName: rawOrder.dispatcherName,
    createdAt: rawOrder.createdAt || new Date().toISOString(),
    updatedAt: rawOrder.updatedAt || new Date().toISOString(),
  };
}

export function useDispatcherPortal() {
  const [activeTab, setActiveTab] = useState<"queue" | "riders" | "live_map">("queue");
  const [errands, setErrands] = useState<Errand[]>([]);
  const [riders, setRiders] = useState<MockRider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedErrandId, setSelectedErrandId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/orders/pabili`);
      if (res.ok) {
        const data = await res.json();
        const mapped = (data.orders || []).map(mapOrderToErrand);
        setErrands(mapped);
      }
    } catch (err) {
      console.warn("Failed to fetch MariaDB orders:", err);
    }
  }, []);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      await fetchOrders();
      try {
        const fetchedRiders = await ErrandService.getRiders();
        setRiders(fetchedRiders);
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
      const errand = mapOrderToErrand(newOrder);
      setErrands((prev) => [errand, ...prev.filter((e) => e.id !== errand.id)]);
    });

    socket.on("order:claimed", (claimedOrder: any) => {
      console.log("[Socket.io] Received order:claimed:", claimedOrder);
      const errand = mapOrderToErrand(claimedOrder);
      setErrands((prev) => prev.map((e) => (e.id === errand.id ? errand : e)));
    });

    socket.on("order:updated", (updatedOrder: any) => {
      const errand = mapOrderToErrand(updatedOrder);
      setErrands((prev) => prev.map((e) => (e.id === errand.id ? errand : e)));
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchOrders]);

  const handleClaimOrder = async (orderId: string, currentUser: any) => {
    const dispatcherFirstName = currentUser?.name ? currentUser.name.split(" ")[0] : "Dispatcher";
    const dispatcherId = currentUser?.id || 1;

    try {
      const res = await fetch(`${BACKEND_URL}/api/orders/pabili/${orderId}/claim`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dispatcherId,
          dispatcherName: dispatcherFirstName,
        }),
      });

      if (res.status === 409) {
        const data = await res.json();
        alert(`This order was already accepted by ${data.claimedBy || "another dispatcher"}.`);
        fetchOrders();
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to claim order");
        return;
      }

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
      alert(err.message || "Failed to connect to backend for order claim.");
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
      const res = await fetch(`${BACKEND_URL}/api/orders/pabili/${errandId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });
      if (res.ok) {
        setErrands((prev) =>
          prev.map((e) => (e.id === errandId ? { ...e, status: targetStatus } : e))
        );
      } else {
        const updated = await ErrandService.updateErrandStatus(errandId, targetStatus);
        setErrands((prev) => prev.map((e) => (e.id === errandId ? updated : e)));
      }
    } catch (err: any) {
      alert(err.message || "Failed to update status");
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
