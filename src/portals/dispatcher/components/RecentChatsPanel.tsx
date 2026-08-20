import React, { useState, useMemo } from "react";
import { formatErrandId } from "../../../utils/formatErrandId";
import {
  Search,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";

const STATUS_FILTERS = [
  { id: "ALL", label: "All" },
  { id: "PENDING", label: "Pending" },
  { id: "ASSIGNED", label: "Assigned" },
  { id: "IN_TRANSIT", label: "In Transit" },
  { id: "DELIVERED", label: "Delivered" },
  { id: "CANCELLED", label: "Cancelled" },
];

const ITEMS_PER_PAGE = 10;

interface RecentChatsPanelProps {
  errands: any[];
  onOpenChat: (orderId: string) => void;
}

export function RecentChatsPanel({ errands, onOpenChat }: RecentChatsPanelProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const closedErrands = useMemo(() => {
    return errands.filter((e) => String(e.status).toUpperCase() !== "AVAILABLE");
  }, [errands]);

  const filteredErrands = useMemo(() => {
    return closedErrands.filter((e) => {
      const matchesStatus =
        statusFilter === "ALL" || String(e.status).toUpperCase() === statusFilter;
      if (!matchesStatus) return false;

      const query = search.trim().toLowerCase();
      if (!query) return true;
      return (
        String(e.id).toLowerCase().includes(query) ||
        String(e.customerName || "").toLowerCase().includes(query) ||
        String(e.category || "").toLowerCase().includes(query)
      );
    });
  }, [closedErrands, statusFilter, search]);

  // Reset to page 1 whenever filters or search query change
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredErrands.length / ITEMS_PER_PAGE));
  const paginatedErrands = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredErrands.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredErrands, currentPage]);

  const getStatusBadge = (status: string) => {
    const s = String(status || "").toUpperCase();
    if (s === "COMPLETED" || s === "DELIVERED") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (s === "CANCELLED") {
      return "bg-red-50 text-red-700 border-red-200";
    }
    if (s === "IN_TRANSIT" || s === "DOING ERRAND") {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }
    return "bg-amber-50 text-amber-700 border-amber-200";
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* FIXED SEARCH & FILTER HEADER (Part of Green Region)           */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
              <MessageSquare size={18} className="text-[#1E3A5F]" />
              <span>Customer Conversations</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Review chat transcripts, customer instructions, and delivery agreements.
            </p>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search ID, customer, store..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 font-medium outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:bg-white transition"
            />
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100">
          {STATUS_FILTERS.map((f) => {
            const isActive = statusFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => handleStatusFilterChange(f.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  isActive
                    ? "bg-[#1E3A5F] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:text-slate-900"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SCROLLABLE TABLE & PAGINATION CONTAINER (Pink Region)         */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden min-h-0">
        {/* Scrollable Table Content */}
        <div className="flex-1 overflow-y-auto overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-xs text-slate-500 uppercase font-extrabold tracking-wider border-b border-slate-200 text-[10px] z-10">
              <tr>
                <th className="p-4">Errand ID</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Category</th>
                <th className="p-4">Delivery Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedErrands.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-4 font-mono font-bold text-[#1E3A5F]">
                    {formatErrandId(e.id)}
                  </td>
                  <td className="p-4 font-extrabold text-slate-900">
                    {e.customerName || "Customer"}
                  </td>
                  <td className="p-4 font-medium text-slate-600">
                    {e.category || "General Errand"}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${getStatusBadge(
                        e.status
                      )}`}
                    >
                      {e.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => onOpenChat(e.id)}
                      className="inline-flex items-center gap-1.5 bg-[#1E3A5F] hover:bg-[#162D4A] text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition"
                    >
                      <Eye size={13} />
                      <span>View Chat</span>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredErrands.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-slate-400 italic">
                    {closedErrands.length === 0
                      ? "No customer conversations recorded yet."
                      : "No conversations match your search or filter."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Pagination Bar */}
        <div className="shrink-0 bg-slate-50/80 border-t border-slate-200 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing{" "}
            <span className="font-bold text-slate-800">
              {filteredErrands.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}
            </span>{" "}
            to{" "}
            <span className="font-bold text-slate-800">
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredErrands.length)}
            </span>{" "}
            of <span className="font-bold text-slate-800">{filteredErrands.length}</span>{" "}
            conversations
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className={`p-1.5 rounded-lg border transition ${
                currentPage <= 1
                  ? "border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50"
                  : "border-slate-300 text-slate-700 hover:bg-white bg-slate-50/50 shadow-2xs"
              }`}
            >
              <ChevronLeft size={16} />
            </button>

            <span className="text-xs font-bold text-slate-700 px-2">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className={`p-1.5 rounded-lg border transition ${
                currentPage >= totalPages
                  ? "border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50"
                  : "border-slate-300 text-slate-700 hover:bg-white bg-slate-50/50 shadow-2xs"
              }`}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
