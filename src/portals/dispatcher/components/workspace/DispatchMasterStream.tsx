import React from "react";
import { Errand } from "../../../../types/errand";
import { DispatchErrandCard } from "./DispatchErrandCard";
import { Search, SlidersHorizontal, CheckCircle2, Inbox } from "lucide-react";

interface DispatchMasterStreamProps {
  errands: Errand[];
  selectedErrandId: string | null;
  onSelectErrand: (errand: Errand) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  categories: string[];
  activeSegment: "INCOMING" | "ACTIVE";
  onSegmentChange: (seg: "INCOMING" | "ACTIVE") => void;
  incomingCount: number;
  activeCount: number;
}

export const DispatchMasterStream: React.FC<DispatchMasterStreamProps> = ({
  errands,
  selectedErrandId,
  onSelectErrand,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  categories,
  activeSegment,
  onSegmentChange,
  incomingCount,
  activeCount,
}) => {
  return (
    <div className="flex flex-col h-full bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP TOOLBAR: Segmented Capsule Switcher & Search Bar        */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-3.5 sm:p-4 border-b border-slate-100 space-y-3 bg-white/90 backdrop-blur-xs">
        {/* Apple Segmented Pill Switcher */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => onSegmentChange("INCOMING")}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeSegment === "INCOMING"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Incoming</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeSegment === "INCOMING"
                  ? "bg-blue-100 text-blue-800 font-bold"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {incomingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSegmentChange("ACTIVE")}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeSegment === "ACTIVE"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Active</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeSegment === "ACTIVE"
                  ? "bg-blue-100 text-blue-800 font-bold"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {activeCount}
            </span>
          </button>
        </div>

        {/* Search Bar with Cmd+K Badge */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search Errand, Customer, Store..."
            className="w-full pl-9 pr-14 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded-md bg-white">
            ⌘K
          </span>
        </div>

        {/* Category Filter Chips */}
        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => onCategoryChange("ALL")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === "ALL"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => onCategoryChange(cat)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory.toLowerCase() === cat.toLowerCase()
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. MASTER CARDS STREAM (Scrollable list)                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-3.5 space-y-2.5">
        {errands.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center my-auto">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <Inbox size={22} />
            </div>
            <p className="text-xs font-bold text-slate-700">No Errands in this View</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
              {searchQuery
                ? `No orders matching "${searchQuery}"`
                : "New incoming orders will appear here automatically."}
            </p>
          </div>
        ) : (
          errands.map((errand) => (
            <DispatchErrandCard
              key={errand.id}
              errand={errand}
              isSelected={selectedErrandId === errand.id}
              onClick={() => onSelectErrand(errand)}
            />
          ))
        )}
      </div>
    </div>
  );
};
