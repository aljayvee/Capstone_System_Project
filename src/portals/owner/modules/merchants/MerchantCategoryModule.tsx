import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Store,
  CheckCircle2,
  AlertCircle,
  Building2,
  Search,
  Filter,
  Layers,
  Sparkles,
  RefreshCw,
  FolderPlus,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { apiService, type ApiMerchantCategory } from "../../../../services/apiService";
import { CategoryRowCard } from "./components/CategoryCard";
import { ServerStatusBadge } from "../../../../components/ServerStatusBadge";
import { NotificationBell } from "../../../../components/NotificationBell";

export const MerchantCategoryModule: React.FC = () => {
  const [categories, setCategories] = useState<ApiMerchantCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "Active" | "Inactive">("ALL");

  // Create Category Modal / Drawer Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadCategories = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const backendCategories = await apiService.getMerchantCategories();
      if (backendCategories) {
        setCategories(backendCategories);
      } else {
        setLoadError("Could not load merchant categories from the server.");
      }
    } catch (err: any) {
      setLoadError("Failed to fetch merchant categories. Please verify server connection.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newCatName.trim()) {
      setFormError("Please enter a valid category name.");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await apiService.createMerchantCategory({
        name: newCatName.trim(),
        description: newCatDesc.trim() || "Partner store & errand category",
      });

      if (created) {
        setCategories((prev) => [...prev, created]);
        setNewCatName("");
        setNewCatDesc("");
        setShowAddForm(false);
      } else {
        setFormError("Failed to create category. A category with this name may already exist.");
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Failed to create category.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCategoryUpdated = (updated: ApiMerchantCategory) => {
    setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  // Metrics computation for visual summary cards
  const totalCategories = categories.length;
  const activeCategories = useMemo(
    () => categories.filter((c) => c.status === "Active").length,
    [categories]
  );
  const totalLinkedPlaces = useMemo(
    () => categories.reduce((sum, c) => sum + (c._count?.places ?? 0), 0),
    [categories]
  );

  const filteredCategories = categories.filter((c) => {
    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
    if (!matchesStatus) return false;

    const q = search.trim().toLowerCase();
    if (!q) return true;

    return (
      c.name.toLowerCase().includes(q) ||
      (c.description ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER & PRIMARY ACTION                                */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/95 backdrop-blur-md p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
              <Store size={20} />
            </span>
            <h2 className="text-xl font-extrabold text-slate-800">Store Categories</h2>
          </div>
          <p className="text-xs text-slate-500 max-w-xl">
            Manage store types for food, pharmacy, groceries, and services.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadCategories}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition shadow-2xs"
            title="Refresh Categories"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          </button>
          <NotificationBell />
          <ServerStatusBadge />
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-[#1E3A5F] hover:bg-[#162D4A] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition ml-1"
          >
            <Plus size={16} />
            <span>Add New Category</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. PSYCHOLOGICAL SUMMARY STATS (Anchoring & Quick Glance)      */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold">
            <Layers size={24} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Categories</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{totalCategories}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Categories</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{activeCategories}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold">
            <Building2 size={24} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Categorized Stores</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{totalLinkedPlaces}</p>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. SEARCH & STATUS FILTER RAIL                                */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search category name or description..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:bg-white transition"
          />
        </div>

        {/* Status Segmented Filter */}
        <div className="flex items-center gap-1.5 shrink-0 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              statusFilter === "ALL"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All ({totalCategories})
          </button>
          <button
            onClick={() => setStatusFilter("Active")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              statusFilter === "Active"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Active ({activeCategories})
          </button>
          <button
            onClick={() => setStatusFilter("Inactive")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              statusFilter === "Inactive"
                ? "bg-slate-700 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Inactive ({totalCategories - activeCategories})
          </button>
        </div>
      </div>

      {loadError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold px-4 py-3 rounded-2xl flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. MODAL FORM: CREATE NEW CATEGORY (Frictionless popup)       */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#1E3A5F] text-white flex items-center justify-center font-bold">
                  <FolderPlus size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">Add Merchant Category</h3>
                  <p className="text-[11px] text-slate-500">Create a new partner store classification</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Bakeries & Pastries, Hardware & Construction"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-xs font-medium outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="Describe the types of items, partner shops, and services included in this category..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-xs font-medium outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:bg-white transition resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#1E3A5F] hover:bg-[#162D4A] text-white shadow-sm transition flex items-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>Save Category</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. CARDS GRID (Gestalt Proximity, Visual Hierarchy, & Actions)  */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 space-y-3 bg-white rounded-2xl border border-slate-200">
          <Loader2 size={28} className="animate-spin text-[#1E3A5F] mx-auto" />
          <p className="text-xs font-medium">Loading merchant categories...</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-xs border border-slate-200 text-center space-y-3">
          <Store size={40} className="text-slate-300 mx-auto" />
          <h4 className="font-bold text-slate-700 text-sm">No categories found</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {categories.length === 0
              ? "No merchant categories have been registered yet. Click 'Add New Category' above to create one."
              : "No categories match your search or status filter."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCategories.map((cat, idx) => (
            <CategoryRowCard
              key={cat.id}
              category={cat}
              onUpdated={handleCategoryUpdated}
              index={idx}
            />
          ))}
        </div>
      )}
    </div>
  );
};
