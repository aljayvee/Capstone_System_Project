import React, { useState, useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Errand } from "../../../../types/errand";
import { apiClient } from "../../../../services/apiClient";
import { postUnderReview } from "../../../../services/chatSystemMessages";
import { DispatchMasterStream } from "./DispatchMasterStream";
import { DispatchDetailInspector } from "./DispatchDetailInspector";
import { PanelShell } from "@/components/panel/PanelShell";

interface DispatchManagementWorkspaceProps {
  errands: Errand[];
  currentUser: any;
  onClaimOrder: (orderId: string, user: any) => Promise<void> | void;
  onOpenChat: (orderId: string) => void;
  onDeclineOrder?: (orderId: string, reason?: string) => Promise<void> | void;
  unreadCounts?: Record<string, number>;
  /** Additive, all optional, so the existing call site keeps working. */
  isLoading?: boolean;
  loadError?: string | null;
  onRetry?: () => void;
  selectedErrandId?: string | null;
  onSelectErrand?: (id: string | null) => void;
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
  onDeclineOrder,
  unreadCounts,
  isLoading = false,
  loadError = null,
  onRetry,
  selectedErrandId: externalSelectedErrandId,
  onSelectErrand,
}) => {
  // Below the side-by-side breakpoint the board and the run share the screen
  // one at a time. Stacking them was the old behaviour and it did not work:
  // the columns carried `min-h-[580px]` and `min-h-[400px]`, so a tablet got
  // a page taller than itself with the run pushed below the fold.
  const [narrowPane, setNarrowPane] = useState<"board" | "run">("board");
  const [selectedErrandId, setSelectedErrandId] = useState<string | null>(externalSelectedErrandId || null);
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
  // Incoming is first in, first out: the run that has waited longest sits on
  // top and is the one auto-selected. Sorted here rather than taken from the
  // array, because the server sends newest first (Recent Chats and the Active
  // panel rely on that) and live `order:new` events prepend.
  const availableErrands = useMemo(() => {
    const placedAt = (e: Errand) => {
      const t = Date.parse(e.createdAt);
      // An unreadable time goes to the back rather than jumping the queue.
      return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
    };
    return errands
      .filter((e) => String(e.status).toUpperCase() === "AVAILABLE")
      .sort((a, b) => {
        const ta = placedAt(a);
        const tb = placedAt(b);
        if (ta !== tb) return ta < tb ? -1 : 1;
        return String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
      });
  }, [errands]);

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

  // Synchronize selection when an external errand is targeted (e.g. deep-link from Dashboard)
  useEffect(() => {
    if (externalSelectedErrandId) {
      setSelectedErrandId(externalSelectedErrandId);
      const isAvailable = availableErrands.some((e) => e.id === externalSelectedErrandId);
      if (isAvailable) {
        setActiveSegment("INCOMING");
      } else {
        const isActive = activeErrands.some((e) => e.id === externalSelectedErrandId);
        if (isActive) {
          setActiveSegment("ACTIVE");
        }
      }
      setNarrowPane("run");
    }
  }, [externalSelectedErrandId, availableErrands, activeErrands]);

  // Auto-selection of first item when list changes or current item is missing
  useEffect(() => {
    if (currentDisplayedList.length > 0) {
      const exists = currentDisplayedList.some((e) => e.id === selectedErrandId);
      if (!exists) {
        setSelectedErrandId(currentDisplayedList[0].id);
        onSelectErrand?.(currentDisplayedList[0].id);
      }
    } else {
      setSelectedErrandId(null);
      onSelectErrand?.(null);
    }
  }, [currentDisplayedList, selectedErrandId, onSelectErrand]);

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

  const board = (
    <DispatchMasterStream
      errands={currentDisplayedList}
      selectedErrandId={selectedErrandId}
      onSelectErrand={(e) => {
        setSelectedErrandId(e.id);
        onSelectErrand?.(e.id);
        // On a narrow screen, picking a run opens its detail pane.
        setNarrowPane("run");
      }}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      selectedCategory={selectedCategory}
      onCategoryChange={setSelectedCategory}
      categories={activeCategoryNames}
      activeSegment={activeSegment}
      onSegmentChange={setActiveSegment}
      incomingCount={availableErrands.length}
      activeCount={activeErrands.length}
      unreadCounts={unreadCounts}
      isLoading={isLoading}
      loadError={loadError}
      onRetry={onRetry}
    />
  );

  const run = (
    <DispatchDetailInspector
      errand={selectedErrand}
      onClaimAndReview={handleClaimAndReview}
      onDecline={onDeclineOrder}
      onOpenChat={onOpenChat}
      isClaiming={openingId !== null}
      claimError={claimError}
      onDismissClaimError={() => setClaimError(null)}
      isLoading={isLoading}
      loadError={loadError}
      onBackToBoard={() => setNarrowPane("board")}
    />
  );

  return (
    // Height comes from the flex chain rather than from viewport arithmetic.
    // This was `h-[calc(100vh-250px)] min-h-[580px]`, a guess about the height
    // of a header this component cannot see, with a floor that guaranteed
    // overflow on a 1280x720 laptop and on every tablet.
    <PanelShell title="Dispatch Management" headingLevel="h1" scrollable={false}>
    <div className="flex h-full min-h-0 w-full flex-col gap-4">
      {/* Narrow: one pane at a time, switched here. */}
      <div className="flex shrink-0 items-center gap-1 rounded-plate border border-edge bg-board-plate p-1 lg:hidden">
        <button
          type="button"
          onClick={() => setNarrowPane("board")}
          aria-pressed={narrowPane === "board"}
          className={cn(
            "min-h-9 flex-1 cursor-pointer rounded-trim px-3 text-micro font-semibold uppercase tracking-[0.06em] transition-colors",
            narrowPane === "board"
              ? "bg-board-field text-board-plate"
              : "text-ink-muted hover:text-ink hover:bg-board-ground/60"
          )}
        >
          The board
        </button>
        <button
          type="button"
          onClick={() => setNarrowPane("run")}
          aria-pressed={narrowPane === "run"}
          disabled={!selectedErrand}
          className={cn(
            "min-h-9 flex-1 cursor-pointer rounded-trim px-3 text-micro font-semibold uppercase tracking-[0.06em] transition-colors disabled:cursor-not-allowed disabled:text-board-trim",
            narrowPane === "run"
              ? "bg-board-field text-board-plate"
              : "text-ink-muted hover:text-ink hover:bg-board-ground/60"
          )}
        >
          The run
        </button>
      </div>

      {/* The documented ratio, expressed as the documented ratio. This was
          `lg:grid-cols-12` with a 5/7 split, which is 41.7/58.3, not the
          38/62 AGENTS.md 8.30 specifies. */}
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[38fr_62fr]">
        {/* min-w-0 on both, not just min-h-0. A grid item defaults to
            min-width:auto, so a pane whose content is wider than its track
            refuses to shrink and pushes the whole page into horizontal
            scroll. That is what happened at tablet width: the run pane's
            contact row held the grid open and clipped the board strip. */}
        <div className={cn("min-h-0 min-w-0", narrowPane === "board" ? "block" : "hidden lg:block")}>
          {board}
        </div>
        <div className={cn("min-h-0 min-w-0", narrowPane === "run" ? "block" : "hidden lg:block")}>
          {run}
        </div>
      </div>
    </div>
    </PanelShell>
  );
};
