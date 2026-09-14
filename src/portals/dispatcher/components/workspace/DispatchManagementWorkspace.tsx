import React, { useState, useEffect, useRef, useMemo } from "react";
import { Errand, ErrandStatus } from "../../../../types/errand";
import { apiClient } from "../../../../services/apiClient";
import { postUnderReview } from "../../../../services/chatSystemMessages";
import { useRiderFleetPresence } from "../../../../hooks/useRiderFleetPresence";
import { DispatchKpiCards } from "./DispatchKpiCards";
import { DispatchMasterStream } from "./DispatchMasterStream";
import { DispatchDetailInspector } from "./DispatchDetailInspector";

interface DispatchManagementWorkspaceProps {
  errands: Errand[];
  currentUser: any;
  onClaimOrder: (orderId: string, user: any) => Promise<void> | void;
  onOpenChat: (orderId: string) => void;
  onUpdateStatus: (errandId: string, newStatus: ErrandStatus) => Promise<void> | void;
  onDeclineOrder?: (orderId: string, reason?: string) => Promise<void> | void;
}

interface MerchantCategoryItem {
  id: number;
  name: string;
  description?: string;
  status?: string;
}

export const DispatchManagementWorkspace: React.FC<DispatchManagementWorkspaceProps> = ({
  errands,
  currentUser,
  onClaimOrder,
  onOpenChat,
  onUpdateStatus,
  onDeclineOrder,
}) => {
  const { riders } = useRiderFleetPresence();
  const [selectedErrandId, setSelectedErrandId] = useState<string | null>(null);
  const [activeSegment, setActiveSegment] = useState<"INCOMING" | "ACTIVE">("INCOMING");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [merchantCategories, setMerchantCategories] = useState<MerchantCategoryItem[]>([]);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  const announcedReviewsRef = useRef<Set<string>>(new Set());

  // Fetch active merchant categories dynamically from API
  useEffect(() => {
    let isMounted = true;
    async function loadMerchantCategories() {
      try {
        const res = await apiClient.get<MerchantCategoryItem[]>("/merchant-categories");
        if (isMounted && Array.isArray(res.data)) {
          const active = res.data.filter((c) => !c.status || c.status === "Active");
          setMerchantCategories(active);
        }
      } catch (err) {
        console.warn("Failed to load merchant categories:", err);
      }
    }
    loadMerchantCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter pools
  const availableErrands = useMemo(
    () => errands.filter((e) => String(e.status).toUpperCase() === "AVAILABLE"),
    [errands]
  );

  const activeErrands = useMemo(
    () =>
      errands.filter((e) => {
        const s = String(e.status).toUpperCase();
        return (
          s !== "AVAILABLE" &&
          s !== "CANCELLED" &&
          s !== "PASSING BY" &&
          s !== "COMPLETED" &&
          s !== "DELIVERED"
        );
      }),
    [errands]
  );

  // Dynamic category names
  const activeCategoryNames = useMemo(() => {
    return Array.from(
      new Set([
        ...merchantCategories.map((m) => m.name),
        ...errands.map((e) => e.category).filter(Boolean),
      ])
    );
  }, [merchantCategories, errands]);

  // Apply search and category filtering
  const filterList = (list: Errand[]) => {
    return list.filter((e) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        String(e.id).toLowerCase().includes(q) ||
        String(e.customerName || "").toLowerCase().includes(q) ||
        String(e.customerPhone || "").toLowerCase().includes(q) ||
        String(e.category || "").toLowerCase().includes(q) ||
        String(e.deliveryAddress || "").toLowerCase().includes(q) ||
        String(e.description || "").toLowerCase().includes(q);

      const matchesCat =
        selectedCategory === "ALL" ||
        String(e.category || "").toLowerCase() === selectedCategory.toLowerCase() ||
        (e.pabiliDetails &&
          e.pabiliDetails.some((d) =>
            String(d.storeCategory || "").toLowerCase().includes(selectedCategory.toLowerCase())
          ));

      return matchesSearch && matchesCat;
    });
  };

  // Filtered lists for each segment
  const filteredIncoming = useMemo(() => filterList(availableErrands), [availableErrands, searchQuery, selectedCategory]);
  const filteredActive = useMemo(() => filterList(activeErrands), [activeErrands, searchQuery, selectedCategory]);

  const currentDisplayedList = useMemo(() => {
    if (activeSegment === "INCOMING") return filteredIncoming;
    return filteredActive;
  }, [activeSegment, filteredIncoming, filteredActive]);

  // Auto-selection of first item when list changes or current item is missing
  useEffect(() => {
    if (currentDisplayedList.length > 0) {
      const exists = currentDisplayedList.some((e) => e.id === selectedErrandId);
      if (!exists) {
        setSelectedErrandId(currentDisplayedList[0].id);
      }
    } else {
      setSelectedErrandId(null);
    }
  }, [currentDisplayedList, selectedErrandId]);

  const selectedErrand = useMemo(
    () => errands.find((e) => e.id === selectedErrandId) || null,
    [errands, selectedErrandId]
  );

  // Claim & review flow
  const handleClaimAndReview = async (errand: Errand) => {
    const id = String(errand.id);
    if (openingId) return;

    setOpeningId(id);
    setClaimError(null);
    try {
      await onClaimOrder(id, currentUser);

      if (!announcedReviewsRef.current.has(id)) {
        announcedReviewsRef.current.add(id);
        void postUnderReview(id, currentUser?.name);
      }
      onOpenChat(id);
    } catch (err: any) {
      setClaimError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          "This order could not be opened. It may have just been claimed by another dispatcher."
      );
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP KPI TELEMETRY CARDS (Frosted Glass Apple Design)       */}
      {/* ───────────────────────────────────────────────────────────── */}
      <DispatchKpiCards
        errands={errands}
        totalRiders={riders.length}
        onlineRiders={riders.filter((r) => r.online).length}
      />

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. MAIN MASTER-DETAIL WORKSPACE (38% / 62% Split)             */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 h-[calc(100vh-250px)] min-h-[580px]">
        {/* Master Stream (Left Column - 38% / 5 cols) */}
        <div className="lg:col-span-5 h-full min-h-[300px]">
          <DispatchMasterStream
            errands={currentDisplayedList}
            selectedErrandId={selectedErrandId}
            onSelectErrand={(e) => setSelectedErrandId(e.id)}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            categories={activeCategoryNames}
            activeSegment={activeSegment}
            onSegmentChange={setActiveSegment}
            incomingCount={availableErrands.length}
            activeCount={activeErrands.length}
          />
        </div>

        {/* Detail Inspector (Right Column - 62% / 7 cols) */}
        <div className="lg:col-span-7 h-full min-h-[400px]">
          <DispatchDetailInspector
            errand={selectedErrand}
            currentUser={currentUser}
            onClaimAndReview={handleClaimAndReview}
            onDecline={onDeclineOrder}
            onOpenChat={onOpenChat}
            onUpdateStatus={onUpdateStatus}
            isClaiming={openingId !== null}
            claimError={claimError}
            onDismissClaimError={() => setClaimError(null)}
          />
        </div>
      </div>
    </div>
  );
};
