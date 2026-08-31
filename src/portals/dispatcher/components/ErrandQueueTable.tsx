import React, { useState, useEffect, useRef } from "react";
import { Errand, ErrandStatus } from "../../../types/errand";
import { summarizeEta } from "../../../utils/eta";
import { formatErrandId } from "../../../utils/formatErrandId";
import { apiClient } from "../../../services/apiClient";
import { ReviewErrandModal } from "./ReviewErrandModal";
import { postUnderReview } from "../../../services/chatSystemMessages";
import { formatPeso } from "../../../utils/format";
import {
  MessageSquare,
  Clock,
  Bike,
  CheckCircle2,
  MapPin,
  Phone,
  ShoppingBag,
  Search,
  Copy,
  Check,
  ChevronRight,
  Eye,
  SlidersHorizontal,
  Package,
  Layers,
  Sparkles,
  Zap,
} from "lucide-react";

interface ErrandQueueTableProps {
  errands: Errand[];
  currentUser: any;
  onClaimOrder: (orderId: string, user: any) => void;
  onOpenChat: (orderId: string) => void;
  onUpdateStatus: (errandId: string, newStatus: ErrandStatus) => void;
  onDeclineOrder?: (orderId: string, reason?: string) => void;
}

interface MerchantCategoryItem {
  id: number;
  name: string;
  description?: string;
  status?: string;
}

export const ErrandQueueTable: React.FC<ErrandQueueTableProps> = ({
  errands,
  currentUser,
  onClaimOrder,
  onOpenChat,
  onUpdateStatus,
  onDeclineOrder,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");
  const [merchantCategories, setMerchantCategories] = useState<MerchantCategoryItem[]>([]);
  const [reviewingErrand, setReviewingErrand] = useState<Errand | null>(null);

  /**
   * Opens the review dialog and tells the customer it is being looked at.
   *
   * Waiting is much easier when you can see that something is happening, and
   * the gap between "sent" and "accepted" was previously silent — the customer
   * had no way to distinguish a request nobody had opened from one being
   * actively worked through.
   *
   * Announced once per errand per session: a dispatcher who opens, closes and
   * reopens the dialog is still the same review, and repeating the line would
   * make the chat look like a stutter.
   */
  const announcedReviewsRef = useRef<Set<string>>(new Set());

  const openReview = (errand: Errand) => {
    setReviewingErrand(errand);
    const id = String(errand.id);
    if (!announcedReviewsRef.current.has(id)) {
      announcedReviewsRef.current.add(id);
      void postUnderReview(id, currentUser?.name);
    }
  };

  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);

  const currentFirstName = currentUser?.name ? currentUser.name.split(" ")[0] : "Dispatcher";
  const currentUserId = currentUser?.id;

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

  const availableErrands = errands.filter((e) => String(e.status).toUpperCase() === "AVAILABLE");
  const ongoingErrands = errands.filter((e) => {
    const s = String(e.status).toUpperCase();
    return s !== "AVAILABLE" && s !== "CANCELLED" && s !== "PASSING BY" && s !== "COMPLETED" && s !== "DELIVERED";
  });

  // Combine categories from backend API and distinct categories present in active errands
  const activeCategoryNames = Array.from(
    new Set([
      ...merchantCategories.map((m) => m.name),
      ...errands.map((e) => e.category).filter(Boolean),
    ])
  );

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
        selectedCategoryFilter === "ALL" ||
        String(e.category || "").toLowerCase() === selectedCategoryFilter.toLowerCase() ||
        (e.pabiliDetails && e.pabiliDetails.some((d) => String(d.storeCategory || "").toLowerCase().includes(selectedCategoryFilter.toLowerCase())));

      return matchesSearch && matchesCat;
    });
  };

  const filteredAvailable = filterList(availableErrands);
  const filteredOngoing = filterList(ongoingErrands);

  const handleCopyPhone = (phone: string, errandId: string, evt: React.MouseEvent) => {
    evt.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedPhoneId(errandId);
    setTimeout(() => setCopiedPhoneId(null), 2000);
  };

  const handleModalAccept = async (errandId: string) => {
    await onClaimOrder(errandId, currentUser);
    setReviewingErrand(null);
  };

  const handleModalDecline = async (errandId: string, reason?: string) => {
    if (onDeclineOrder) {
      await onDeclineOrder(errandId, reason);
    } else {
      await onUpdateStatus(errandId, "Cancelled" as ErrandStatus);
    }
    setReviewingErrand(null);
  };

  return (
    <div className="space-y-6">
      {/* ─── 1. OPERATIONAL FILTER & SEARCH BAR ───────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Dynamic Merchant Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategoryFilter("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              selectedCategoryFilter === "ALL"
                ? "bg-[#1E3A5F] text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span>All Categories</span>
            <span
              className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                selectedCategoryFilter === "ALL" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              }`}
            >
              {availableErrands.length}
            </span>
          </button>

          {activeCategoryNames.map((catName) => {
            const count = availableErrands.filter((e) =>
              String(e.category || "").toLowerCase() === catName.toLowerCase() ||
              (e.pabiliDetails && e.pabiliDetails.some((d) => String(d.storeCategory || "").toLowerCase().includes(catName.toLowerCase())))
            ).length;

            const isSelected = selectedCategoryFilter.toLowerCase() === catName.toLowerCase();
            return (
              <button
                key={catName}
                onClick={() => setSelectedCategoryFilter(catName)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? "bg-[#1E3A5F] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span>{catName}</span>
                <span
                  className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                    isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: Search Input */}
        <div className="relative w-full md:w-72">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Errand ID, customer, address..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 font-medium outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:bg-white transition"
          />
        </div>
      </div>

      {/* ─── 2. AVAILABLE ERRAND QUEUE (REVIEW FIRST WORKFLOW) ─────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping inline-block" />
              <span>Available Errands (Awaiting Review)</span>
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-black bg-amber-50 text-amber-700 px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1.5">
              <Clock size={13} />
              <span>{availableErrands.length} Incoming</span>
            </span>
          </div>
        </div>

        {/* Available Errands Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase font-black tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="p-4">Errand / Time</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Items / Category</th>
                <th className="p-4">Delivery Destination</th>
                <th className="p-4">Est. Total</th>
                <th className="p-4 text-right">Inspection & Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAvailable.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto border border-amber-100">
                        <CheckCircle2 size={24} />
                      </div>
                      <p className="text-sm font-extrabold text-slate-700">No Pending Requests In Queue</p>
                      <p className="text-xs text-slate-400">
                        {availableErrands.length === 0
                          ? "All incoming customer errands have been reviewed and dispatched."
                          : "No available errands match your search query."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAvailable.map((e) => {
                  const createdAtDate = e.createdAt ? new Date(e.createdAt) : new Date();
                  const elapsedMinutes = Math.max(0, Math.round((Date.now() - createdAtDate.getTime()) / 60000));
                  const timeBadge = elapsedMinutes < 1 ? "Just now" : `${elapsedMinutes}m ago`;

                  const items = (e.pabiliDetails && e.pabiliDetails.length > 0)
                    ? e.pabiliDetails
                    : (e.pabiliItemRequests && e.pabiliItemRequests.length > 0)
                    ? e.pabiliItemRequests
                    : [];

                  const totalItemsCount = items.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);
                  const itemsPreview = items.length > 0
                    ? `${items.map((it) => `${it.itemName}${it.quantity ? ` (×${it.quantity})` : ""}`).slice(0, 2).join(", ")}${items.length > 2 ? ` +${items.length - 2} more` : ""}`
                    : e.description || "Custom Errand Request";

                  return (
                    <tr
                      key={e.id}
                      onClick={() => openReview(e)}
                      className="hover:bg-blue-50/50 transition cursor-pointer group"
                    >
                      {/* Errand ID & Waiting Time */}
                      <td className="p-4 align-top">
                        <span className="font-mono font-black text-[#1E3A5F] text-xs block group-hover:text-blue-600 transition">
                          {formatErrandId(e.id)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full mt-1.5">
                          <Clock size={11} /> {timeBadge}
                        </span>
                      </td>

                      {/* Customer Info */}
                      <td className="p-4 align-top">
                        <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                          <span>{e.customerName || "Customer"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono mt-1">
                          <Phone size={11} className="text-slate-400" />
                          <span>{e.customerPhone || "09123456789"}</span>
                          <button
                            type="button"
                            onClick={(evt) => handleCopyPhone(e.customerPhone || "09123456789", e.id, evt)}
                            className="text-blue-600 hover:text-blue-800 transition ml-0.5"
                            title="Copy Phone Number"
                          >
                            {copiedPhoneId === e.id ? (
                              <Check size={11} className="text-emerald-500" />
                            ) : (
                              <Copy size={11} />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Items & Category */}
                      <td className="p-4 align-top max-w-xs">
                        <div className="flex items-center gap-2">
                          <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">
                            {e.category || "Pabili"}
                          </span>
                          {items.length > 0 && (
                            <span className="bg-slate-100 text-slate-700 text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                              <ShoppingBag size={11} /> {items.length} item{items.length > 1 ? "s" : ""} ({totalItemsCount} units)
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 truncate mt-1.5 italic">
                          "{itemsPreview}"
                        </p>
                      </td>

                      {/* Delivery Destination */}
                      <td className="p-4 align-top max-w-xs">
                        <div className="flex items-start gap-1.5 text-xs text-slate-700">
                          <MapPin size={13} className="text-rose-500 shrink-0 mt-0.5" />
                          <span className="truncate">{e.deliveryAddress || "Tacurong City Center"}</span>
                        </div>
                        {e.pickupAddress && e.pickupAddress !== "Store" && (
                          <p className="text-[11px] text-slate-400 truncate mt-1">
                            From: {e.pickupAddress}
                          </p>
                        )}
                      </td>

                      {/* Estimated Rate */}
                      <td className="p-4 align-top">
                        <span className="font-mono font-black text-slate-900 text-xs block">
                          {formatPeso(Number(e.totalCost || (e.estimatedCost || 0) + (e.deliveryFee || 80)))}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">COD Est. Total</span>
                      </td>

                      {/* Review First Action Button */}
                      <td className="p-4 align-top text-right">
                        <button
                          type="button"
                          onClick={(evt) => {
                            evt.stopPropagation();
                            openReview(e);
                          }}
                          className="inline-flex items-center gap-1.5 bg-[#1E3A5F] hover:bg-[#162D4A] text-white font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-sm hover:shadow-md transition cursor-pointer"
                        >
                          <Eye size={14} />
                          <span>Review Request</span>
                          <ChevronRight size={13} className="opacity-70" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── 3. ON-GOING / ACTIVE ERRANDS OVERVIEW TABLE ──────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
              <Bike size={18} className="text-emerald-600" />
              <span>Active Dispatched Errands</span>
            </h3>
          </div>

          <span className="text-xs font-black bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200">
            {ongoingErrands.length} In Progress
          </span>
        </div>

        {/* Ongoing Errands Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase font-black tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="p-4">Errand ID</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Status & ETA</th>
                <th className="p-4">Assigned Rider</th>
                <th className="p-4">Dispatcher</th>
                <th className="p-4 text-right">Dispatch Console</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOngoing.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-400">
                    <p className="text-xs font-medium italic">No active errands currently in progress.</p>
                  </td>
                </tr>
              ) : (
                filteredOngoing.map((e) => {
                  const claimedByMe =
                    (e.dispatcherId && String(e.dispatcherId) === String(currentUserId)) ||
                    (e.dispatcherName && e.dispatcherName.toLowerCase().includes(currentFirstName.toLowerCase())) ||
                    (e.dispatchLogs && e.dispatchLogs.some((log: any) => String(log.dispatcherId) === String(currentUserId) || log.dispatcher?.name?.toLowerCase().includes(currentFirstName.toLowerCase())));

                  const eta = summarizeEta(e.etaLowAt, e.etaHighAt);

                  return (
                    <tr key={e.id} className="hover:bg-slate-50 transition">
                      {/* Errand ID */}
                      <td className="p-4 font-mono font-black text-[#1E3A5F]">{formatErrandId(e.id)}</td>

                      {/* Customer */}
                      <td className="p-4">
                        <p className="font-extrabold text-slate-900">{e.customerName || "Customer"}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{e.customerPhone || "—"}</p>
                      </td>

                      {/* Status & ETA */}
                      <td className="p-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="bg-blue-100 text-blue-800 border border-blue-300 font-extrabold px-2.5 py-0.5 rounded-full text-[10px]">
                            {e.status}
                          </span>
                          {eta && (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border ${
                                eta.isLate
                                  ? "bg-rose-50 text-rose-700 border-rose-200 font-bold"
                                  : "bg-slate-50 text-slate-600 border-slate-200"
                              }`}
                            >
                              <Clock size={11} /> {eta.label}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Rider */}
                      <td className="p-4">
                        {e.riderName ? (
                          <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                            <Bike size={14} className="text-emerald-600" />
                            <span>{e.riderName}</span>
                          </div>
                        ) : (
                          <span className="text-amber-600 font-medium italic text-[11px]">
                            Assigning Rider...
                          </span>
                        )}
                      </td>

                      {/* Dispatcher */}
                      <td className="p-4">
                        <span className="font-semibold text-slate-700 text-xs">
                          {e.dispatcherName || "Dispatcher"}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="p-4 text-right">
                        {claimedByMe ? (
                          <button
                            onClick={() => onOpenChat(e.id)}
                            className="inline-flex items-center gap-1.5 text-xs bg-[#1E3A5F] hover:bg-[#162D4A] text-white font-extrabold px-3 py-1.5 rounded-xl shadow-xs transition"
                          >
                            <MessageSquare size={13} />
                            <span>Open Chat</span>
                          </button>
                        ) : (
                          <span className="text-[11px] bg-slate-100 text-slate-500 font-semibold px-2.5 py-1 rounded-md border border-slate-200">
                            Claimed by {e.dispatcherName || "Another"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── 4. REVIEW ERRAND MODAL (THE REVIEW-FIRST DIALOG) ─────────────── */}
      <ReviewErrandModal
        errand={reviewingErrand}
        isOpen={Boolean(reviewingErrand)}
        onClose={() => setReviewingErrand(null)}
        onAccept={handleModalAccept}
        onDecline={handleModalDecline}
        currentUser={currentUser}
      />
    </div>
  );
};
