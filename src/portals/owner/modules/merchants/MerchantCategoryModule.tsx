import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Store,
  AlertCircle,
  Search,
  FolderPlus,
  Check,
  X,
  Loader2,
  MapPin,
  ArrowUpDown,
  Archive,
  RotateCcw,
} from "lucide-react";
import {
  apiService,
  type ApiMerchantCategory,
  type ApiRateConfig,
} from "../../../../services/apiService";
import { apiClient } from "../../../../services/apiClient";
import { OwnerTabs } from "../../components/OwnerTabs";
import { CategoryRowCard } from "./components/CategoryCard";
import PlacesTab from "./components/PlacesTab";
import { ArchiveTab, type ArchivedPlace } from "./components/ArchiveTab";
import { NotificationBell } from "../../../../components/NotificationBell";
import { HeaderClock } from "../../../../components/HeaderClock";

type CategorySortOption =
  "name-asc" | "name-desc" | "stores-desc" | "stores-asc" | "newest" | "oldest";

export const MerchantCategoryModule: React.FC = () => {
  const [categories, setCategories] = useState<ApiMerchantCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [sortBy, setSortBy] = useState<CategorySortOption>("name-asc");

  const [activeTab, setActiveTab] = useState<"categories" | "places" | "archive">("categories");
  /**
   * Retired stores, fetched here rather than inside the Archive tab so the tab
   * badge can show a count before anyone opens it - an archive nobody knows has
   * anything in it is the same as no archive.
   */
  const [archivedPlaces, setArchivedPlaces] = useState<ArchivedPlace[]>([]);
  /**
   * The retired-stores fetch used to fail into a console.warn and nothing
   * else, which had three visible consequences: `archivedCount` undercounted,
   * the Archive tab's badge disappeared because it is gated on `> 0`, and the
   * tab itself rendered "Nothing archived" over stores that were still there.
   */
  const [archivedPlacesError, setArchivedPlacesError] = useState<string | null>(null);
  const [isLoadingArchivedPlaces, setIsLoadingArchivedPlaces] = useState(true);

  const archivedCount =
    categories.filter((c) => c.status !== "Active").length + archivedPlaces.length;

  const loadArchivedPlaces = React.useCallback(async () => {
    setIsLoadingArchivedPlaces(true);
    try {
      const res = await apiClient.get<ArchivedPlace[]>("/places?includeInactive=true");
      setArchivedPlaces((res.data || []).filter((p) => !p.isActive));
      setArchivedPlacesError(null);
    } catch (err) {
      console.warn("Could not load retired stores:", err);
      setArchivedPlacesError("The retired stores did not load.");
    } finally {
      setIsLoadingArchivedPlaces(false);
    }
  }, []);

  useEffect(() => {
    void loadArchivedPlaces();
  }, [loadArchivedPlaces]);
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
        setLoadError("The merchant categories did not load.");
      }
    } catch (err: any) {
      setLoadError("The merchant categories did not load.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    apiService
      .getRateConfig()
      .then((config) => {
        if (!cancelled) setRateConfig(config);
      })
      // No .catch at all before this. The service resolves null rather than
      // rejecting, so nothing was thrown in practice, but an unhandled
      // rejection was one network-layer change away. A null config is safe
      // here: describeHandlingFeeMode falls back to "the flat fee" and "a
      // percentage" rather than quoting a figure it does not have.
      .catch((err) => {
        console.warn("Could not load the rate config for fee labels:", err);
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
  const activeCategories = useMemo(
    () => categories.filter((c) => c.status === "Active").length,
    [categories],
  );
  const totalLinkedPlaces = useMemo(
    () => categories.reduce((sum, c) => sum + (c._count?.places ?? 0), 0),
    [categories],
  );
  /**
   * What each tab actually shows. Archived things moved out, so a badge counting
   * everything would sit above a shorter list and quietly contradict it.
   */
  /** Nothing arrived AND the request failed: the counts are unknown, not zero. */
  const categoriesUnknown = loadError !== null && categories.length === 0;
  const liveCategories = activeCategories;
  const livePlaces = Math.max(0, totalLinkedPlaces - archivedPlaces.length);

  // Filter and Sort Categories
  const sortedCategories = useMemo(() => {
    const filtered = categories.filter((c) => {
      // Archived categories live in the Archive tab and nowhere else - that is
      // what makes archiving a move rather than a relabelled filter.
      const matchesStatus = c.status === "Active";
      if (!matchesStatus) return false;

      const q = search.trim().toLowerCase();
      if (!q) return true;

      return c.name.toLowerCase().includes(q) || (c.description ?? "").toLowerCase().includes(q);
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
  }, [categories, search, sortBy]);

  return (
    <div className="flex flex-col h-full space-y-3 max-w-7xl mx-auto w-full overflow-hidden">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER & PRIMARY ACTION (STATIC NON-SCROLLING) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-hairline pb-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="truncate text-title uppercase text-ink">Merchants Category</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <HeaderClock />
          <NotificationBell />
          {activeTab === "categories" && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 bg-board-field hover:bg-board-field-deep text-white text-label px-3.5 py-2 rounded-plate transition ml-1"
            >
              <Plus size={15} />
              <span>Add Category</span>
            </button>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. NAVIGATION TABS (STATIC NON-SCROLLING) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {/* One real tab set, replacing three <button>s in a plain div.
          role="tab", aria-selected and role="tablist" appeared ZERO times in
          this portal, so the strip announced three unrelated buttons and gave
          no relationship to the panel it controls. OwnerTabs also supplies
          arrow-key movement and a single tab stop.

          Counts pass `null` rather than 0 when the archive fetch failed, so a
          badge cannot claim an empty archive over a request that never
          answered. */}
      <OwnerTabs
        label="Merchant category view"
        idPrefix="merchants"
        active={activeTab}
        onChange={(id) => setActiveTab(id)}
        tabs={[
          {
            id: "categories",
            label: "Merchant Categories",
            icon: Store,
            // A badge may not report 0 over a request that never answered.
            // Both of these derive from `categories`, so when the fetch failed
            // and nothing arrived they are unknown, not empty.
            count: categoriesUnknown ? null : liveCategories,
          },
          {
            id: "places",
            label: "Location Stores",
            icon: MapPin,
            count: categoriesUnknown ? null : livePlaces,
          },
          {
            id: "archive",
            label: "Archive",
            icon: Archive,
            count: archivedPlacesError ? null : archivedCount,
          },
        ]}
      />

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. ACTIVE TAB CONTENT (CONTAINER FILLS REMAINING HEIGHT) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {/* One panel per tab, each labelled by the tab that selects it, so
          OwnerTabs' aria-controls resolves to a real element. */}
      {activeTab === "categories" ? (
        <div
          role="tabpanel"
          id="merchants-panel-categories"
          aria-labelledby="merchants-tab-categories"
          className="flex-1 min-h-0 flex flex-col space-y-3 overflow-hidden"
        >
          {/* Search, Filter & Sort Rail (STATIC) */}
          <div className="shrink-0 bg-board-plate p-2.5 sm:p-3 rounded-plate border border-edge flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
                size={15}
              />
              <input
                type="text"
                aria-label="Search merchant categories"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search category name or description..."
                className="w-full pl-9 pr-4 py-1.5 bg-board-ground border border-edge rounded-plate text-body text-ink placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-board-field focus:bg-board-plate transition"
              />
            </div>

            {/* Right Group: Sorting. Archived categories are not filtered here -
                they live in the Archive tab. */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {/* Sort Dropdown */}
              <div className="flex items-center gap-1.5 bg-board-ground border border-edge px-3 py-1.5 rounded-plate">
                <ArrowUpDown size={14} className="text-ink-muted" />
                <span className="text-label text-ink-muted">Sort:</span>
                <select
                  aria-label="Sort the categories"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as CategorySortOption)}
                  className="bg-transparent text-label text-ink cursor-pointer"
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

          {loadError && categories.length > 0 && (
            <div className="shrink-0 bg-status-waiting-fill border border-status-waiting-ink/20 text-status-waiting-ink text-label px-4 py-2.5 rounded-plate flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{loadError}</span>
            </div>
          )}

          {/* Cards Grid - ONLY THIS SECTION SCROLLS! */}
          {isLoading ? (
            <div className="flex-1 min-h-0 p-12 text-center text-ink-muted space-y-3 bg-board-plate rounded-plate border border-edge flex flex-col items-center justify-center">
              <Loader2 size={28} className="animate-spin text-board-field" />
              <p className="text-body">Loading merchant categories...</p>
            </div>
          ) : /* Ordered before the empty branch, for the same reason as the
             user directory: the banner above rendered on a failure and
             this panel rendered under it anyway, so a dead endpoint read
             "No merchant categories have been registered yet." The empty
             branch now only runs when the fetch actually succeeded. */
          categories.length === 0 && loadError ? (
            <div className="flex-1 min-h-0 bg-board-plate rounded-plate p-12 border border-edge text-center space-y-3 flex flex-col items-center justify-center">
              <AlertCircle size={22} className="text-status-act-ink" />
              <p className="text-panel text-ink">The categories did not load</p>
              <p className="max-w-sm text-body text-ink-muted">
                {loadError} Nothing is listed because nothing arrived, not because nothing is there.
              </p>
              <button
                onClick={loadCategories}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-plate bg-signal px-4 text-micro uppercase text-board-plate transition-colors hover:bg-signal-deep"
              >
                <RotateCcw size={14} />
                <span>Try again</span>
              </button>
            </div>
          ) : sortedCategories.length === 0 ? (
            <div className="flex-1 min-h-0 bg-board-plate rounded-plate p-12 border border-edge text-center space-y-3 flex flex-col items-center justify-center">
              <Store size={40} className="text-ink-muted" />
              <h4 className=" text-ink text-label">No categories found</h4>
              <p className="text-label text-ink-muted max-w-sm">
                {categories.length === 0
                  ? "No merchant categories have been registered yet. Click 'Add Category' above to create one."
                  : "No categories match your search or status filter."}
              </p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-4">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {sortedCategories.map((cat) => (
                  <CategoryRowCard
                    key={cat.id}
                    category={cat}
                    onUpdated={handleCategoryUpdated}
                    onSelectCategoryForPlaces={handleSelectCategoryForPlaces}
                    rateConfig={rateConfig}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : activeTab === "places" ? (
        <div
          role="tabpanel"
          id="merchants-panel-places"
          aria-labelledby="merchants-tab-places"
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <PlacesTab categories={categories} preSelectedCategory={selectedCategoryForPlaces} />
        </div>
      ) : (
        <div
          role="tabpanel"
          id="merchants-panel-archive"
          aria-labelledby="merchants-tab-archive"
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <ArchiveTab
            categories={categories}
            places={archivedPlaces}
            isLoadingPlaces={isLoadingArchivedPlaces}
            placesError={archivedPlacesError}
            categoriesError={loadError}
            onCategoryRestored={(updated) => {
              setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
            }}
            onPlaceRestored={() => {
              void loadArchivedPlaces();
            }}
          />
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. MODAL FORM: CREATE NEW CATEGORY */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 animate-fade-in">
          <div className="bg-board-plate border border-edge rounded-plate p-6 sm:p-8 max-w-lg w-full space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-hairline">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-plate bg-board-field text-white flex items-center justify-center font-bold">
                  <FolderPlus size={18} />
                </div>
                <div>
                  <h3 className="text-panel text-ink">Add Merchant Category</h3>
                  <p className="text-label text-ink-muted">Create a new store classification</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="p-1.5 rounded-trim hover:bg-board-ground text-ink-muted hover:text-ink transition"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-status-act-fill border border-status-act-ink/20 text-status-act-ink rounded-plate text-label flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-micro text-ink uppercase mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Bakeries & Pastries, Hardware & Construction"
                  className="w-full bg-board-ground border border-edge rounded-plate px-4 py-2.5 text-ink text-body outline-none focus:ring-2 focus:ring-board-field focus:bg-board-plate transition"
                />
              </div>

              <div>
                <label className="block text-micro text-ink uppercase mb-1">Description</label>
                <textarea
                  rows={3}
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="Describe the types of items, partner shops, and services included in this category..."
                  className="w-full bg-board-ground border border-edge rounded-plate px-4 py-2.5 text-ink text-body outline-none focus:ring-2 focus:ring-board-field focus:bg-board-plate transition resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2.5 rounded-plate text-label text-ink-muted hover:bg-board-ground transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-plate text-label bg-board-field hover:bg-board-field-deep text-white transition flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
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
