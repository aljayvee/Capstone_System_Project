import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Store,
  AlertCircle,
  Search,
  Sparkles,
  FolderPlus,
  Check,
  X,
  Loader2,
  MapPin,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { apiService, type ApiMerchantCategory, type ApiRateConfig } from "../../../../services/apiService";
import { CategoryRowCard } from "./components/CategoryCard";
import PlacesTab from "./components/PlacesTab";
import { NotificationBell } from "../../../../components/NotificationBell";

type CategorySortOption = "name-asc" | "name-desc" | "stores-desc" | "stores-asc" | "newest" | "oldest";

export const MerchantCategoryModule: React.FC = () => {
  const [categories, setCategories] = useState<ApiMerchantCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "Active" | "Inactive">("ALL");
  const [sortBy, setSortBy] = useState<CategorySortOption>("name-asc");

  const [activeTab, setActiveTab] = useState<"categories" | "places">("categories");
  const [selectedCategoryForPlaces, setSelectedCategoryForPlaces] = useState<number | "ALL">("ALL");

  // Create Category Modal State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // Fetched once here rather than per card: the fee-mode labels quote the live
  // flat amount, percentage and threshold, and those live in Service Rates.
  const [rateConfig, setRateConfig] = useState<ApiRateConfig | null>(null);

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
    let cancelled = false;
    apiService.getRateConfig().then((config) => {
      if (!cancelled) setRateConfig(config);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const handleSelectCategoryForPlaces = (catId: number) => {
    setSelectedCategoryForPlaces(catId);
    setActiveTab("places");
  };

  // Metrics computation for summary overview cards
  const totalCategories = categories.length;
  const activeCategories = useMemo(
    () => categories.filter((c) => c.status === "Active").length,
    [categories]
  );
  const totalLinkedPlaces = useMemo(
    () => categories.reduce((sum, c) => sum + (c._count?.places ?? 0), 0),
    [categories]
  );

  // Filter and Sort Categories
  const sortedCategories = useMemo(() => {
    const filtered = categories.filter((c) => {
      const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
      if (!matchesStatus) return false;

      const q = search.trim().toLowerCase();
      if (!q) return true;

      return (
        c.name.toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q)
      );
    });

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "stores-desc":
          return (b._count?.places ?? 0) - (a._count?.places ?? 0);
        case "stores-asc":
          return (a._count?.places ?? 0) - (b._count?.places ?? 0);
        case "newest":
          return b.id - a.id;
        case "oldest":
          return a.id - b.id;
        default:
          return 0;
      }
    });
  }, [categories, statusFilter, search, sortBy]);

  return (
    <div className="flex flex-col h-full space-y-3 max-w-7xl mx-auto w-full overflow-hidden">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER & PRIMARY ACTION (STATIC NON-SCROLLING)         */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
              <Store size={18} />
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              Merchants & Places Directory
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <NotificationBell />
          {activeTab === "categories" && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 bg-[#1E3A5F] hover:bg-[#162D4A] text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition ml-1"
            >
              <Plus size={15} />
              <span>Add Category</span>
            </button>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. NAVIGATION TABS (STATIC NON-SCROLLING)                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("categories")}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold transition ${
            activeTab === "categories"
              ? "bg-white text-[#1E3A5F] shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <Store size={13} />
          <span>Merchant Categories</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
            activeTab === "categories" ? "bg-blue-50 text-blue-700" : "bg-slate-300 text-slate-700"
          }`}>
            {totalCategories}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("places")}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold transition ${
            activeTab === "places"
              ? "bg-white text-[#1E3A5F] shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <MapPin size={13} />
          <span>Location Stores</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
            activeTab === "places" ? "bg-blue-50 text-blue-700" : "bg-slate-300 text-slate-700"
          }`}>
            {totalLinkedPlaces}
          </span>
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. ACTIVE TAB CONTENT (CONTAINER FILLS REMAINING HEIGHT)       */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "categories" ? (
        <div className="flex-1 min-h-0 flex flex-col space-y-3 overflow-hidden">
          {/* Search, Filter & Sort Rail (STATIC) */}
          <div className="shrink-0 bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search category name or description..."
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:bg-white transition"
              />
            </div>

            {/* Right Group: Status Filter + Sorting */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {/* Status Segmented Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
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

              {/* Sort Dropdown */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <ArrowUpDown size={14} className="text-slate-400" />
                <span className="text-[11px] font-bold text-slate-500">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as CategorySortOption)}
                  className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                >
                  <option value="name-asc">Name (A → Z)</option>
                  <option value="name-desc">Name (Z → A)</option>
                  <option value="stores-desc">Most Stores</option>
                  <option value="stores-asc">Fewest Stores</option>
                  <option value="newest">Recently Added</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>
            </div>
          </div>

          {loadError && (
            <div className="shrink-0 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold px-4 py-2.5 rounded-2xl flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{loadError}</span>
            </div>
          )}

          {/* Cards Grid - ONLY THIS SECTION SCROLLS! */}
          {isLoading ? (
            <div className="flex-1 min-h-0 p-12 text-center text-slate-400 space-y-3 bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center">
              <Loader2 size={28} className="animate-spin text-[#1E3A5F]" />
              <p className="text-xs font-medium">Loading merchant categories...</p>
            </div>
          ) : sortedCategories.length === 0 ? (
            <div className="flex-1 min-h-0 bg-white rounded-2xl p-12 shadow-xs border border-slate-200 text-center space-y-3 flex flex-col items-center justify-center">
              <Store size={40} className="text-slate-300" />
              <h4 className="font-bold text-slate-700 text-sm">No categories found</h4>
              <p className="text-xs text-slate-400 max-w-sm">
                {categories.length === 0
                  ? "No merchant categories have been registered yet. Click 'Add Category' above to create one."
                  : "No categories match your search or status filter."}
              </p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-4 scrollbar-thin">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {sortedCategories.map((cat, idx) => (
                  <CategoryRowCard
                    key={cat.id}
                    category={cat}
                    onUpdated={handleCategoryUpdated}
                    onSelectCategoryForPlaces={handleSelectCategoryForPlaces}
                    index={idx}
                    rateConfig={rateConfig}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <PlacesTab
          categories={categories}
          preSelectedCategory={selectedCategoryForPlaces}
        />
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. MODAL FORM: CREATE NEW CATEGORY                             */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#1E3A5F] text-white flex items-center justify-center font-bold shadow-xs">
                  <FolderPlus size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">Add Merchant Category</h3>
                  <p className="text-[11px] text-slate-500">Create a new store classification</p>
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
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#1E3A5F] hover:bg-[#162D4A] text-white shadow-xs transition flex items-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>Save Category</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
