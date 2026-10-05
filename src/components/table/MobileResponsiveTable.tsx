import React, { useState } from "react";
import {
  ChevronDown,
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Inbox,
  Loader2,
} from "lucide-react";
import { useDeviceTier } from "../../hooks/useDeviceTier";
import {
  RecordInspectorView,
  InspectorSection,
} from "./RecordInspectorView";
import { TableFilterDrawer } from "./TableFilterDrawer";

export interface MobileResponsiveTableProps<T> {
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  isLoading?: boolean;

  /**
   * Complete desktop layout view. When rendered on desktop (width >= 768px),
   * this content is displayed, preserving 100% desktop fidelity.
   */
  desktopView?: React.ReactNode;

  // Mobile-specific 2-column configuration
  primaryHeader: string;
  secondaryHeader: string;
  renderPrimary: (item: T, index: number) => React.ReactNode;
  renderSecondary: (item: T, index: number) => React.ReactNode;

  /**
   * 3-Item Quick Preview rendered inside the expanded accordion row
   */
  renderPreview: (item: T, index: number) => React.ReactNode;

  /**
   * Action buttons rendered inside the expanded accordion row (e.g. View Chat, Edit)
   */
  renderRowActions?: (item: T, index: number) => React.ReactNode;

  // Full-screen Record Inspector configuration
  inspectorTitle?: (item: T) => string;
  inspectorSubtitle?: (item: T) => string;
  inspectorStatusBadge?: (item: T) => React.ReactNode;
  inspectorSections?: (item: T) => InspectorSection[];
  renderInspectorCustom?: (item: T, onClose: () => void) => React.ReactNode;
  inspectorActions?: (item: T, onClose: () => void) => React.ReactNode;

  // Search & Filter controls
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  headerAction?: React.ReactNode;
  filterDrawerTitle?: string;
  filterDrawerContent?: React.ReactNode;
  activeFilterCount?: number;
  onResetFilters?: () => void;
  onApplyFilters?: () => void;

  // Sorting
  sortColumn?: "primary" | "secondary";
  sortDirection?: "asc" | "desc";
  onSortChange?: (column: "primary" | "secondary") => void;

  // Pagination (Compact 44px toolbar)
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalItems?: number;
    pageSize?: number;
  };

  // Empty state fallback
  emptyState?: {
    title?: string;
    message?: string;
    icon?: React.ReactNode;
    action?: React.ReactNode;
  };

  className?: string;
}

export function MobileResponsiveTable<T>({
  data,
  keyExtractor,
  isLoading = false,
  desktopView,
  primaryHeader,
  secondaryHeader,
  renderPrimary,
  renderSecondary,
  renderPreview,
  renderRowActions,
  inspectorTitle,
  inspectorSubtitle,
  inspectorStatusBadge,
  inspectorSections,
  renderInspectorCustom,
  inspectorActions,
  searchPlaceholder = "Search records...",
  searchValue,
  onSearchChange,
  headerAction,
  filterDrawerTitle,
  filterDrawerContent,
  activeFilterCount = 0,
  onResetFilters,
  onApplyFilters,
  sortColumn,
  sortDirection,
  onSortChange,
  pagination,
  emptyState,
  className = "",
}: MobileResponsiveTableProps<T>) {
  const { isMobile } = useDeviceTier();

  // Mobile Single-Expand Accordion state
  const [expandedId, setExpandedId] = useState<string | number | null>(null);

  // Mobile Filter Drawer state
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Mobile Full-screen Record Inspector state
  const [inspectingItem, setInspectingItem] = useState<T | null>(null);

  // On desktop viewports, render the desktop layout directly if provided
  if (!isMobile && desktopView) {
    return <>{desktopView}</>;
  }

  const handleRowClick = (id: string | number) => {
    // Single-expand accordion: tapping active row collapses it; tapping another row auto-collapses previous
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className={`w-full flex flex-col space-y-3 ${className}`}>
      {/* Mobile Top Controls Bar: Search + Filter + HeaderAction */}
      {(onSearchChange || filterDrawerContent || headerAction) && (
        <div className="flex flex-col gap-2 shrink-0">
          <div className="flex items-center gap-2">
            {onSearchChange && (
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchValue || ""}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 min-h-[44px]"
                />
              </div>
            )}

            {filterDrawerContent && (
              <button
                type="button"
                onClick={() => setIsFilterOpen(true)}
                className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold min-h-[44px] shrink-0 active:scale-95 transition-all cursor-pointer ${
                  activeFilterCount > 0
                    ? "bg-red-950/40 border-red-500/60 text-red-400"
                    : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filter</span>
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            )}

            {headerAction && <div className="shrink-0">{headerAction}</div>}
          </div>
        </div>
      )}

      {/* Mobile Filter Drawer */}
      {filterDrawerContent && (
        <TableFilterDrawer
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title={filterDrawerTitle}
          activeFilterCount={activeFilterCount}
          onReset={onResetFilters}
          onApply={onApplyFilters}
        >
          {filterDrawerContent}
        </TableFilterDrawer>
      )}

      {/* Mobile Table Container */}
      <div className="bg-[#0B132B] border border-slate-800/90 rounded-2xl overflow-hidden shadow-sm">
        {/* Compact 2-Column Header with Tap-to-Sort */}
        <div className="grid grid-cols-2 px-4 py-2.5 bg-slate-900/90 border-b border-slate-800/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none">
          <div
            onClick={() => onSortChange && onSortChange("primary")}
            className={`flex items-center gap-1.5 ${
              onSortChange ? "cursor-pointer hover:text-slate-200" : ""
            }`}
          >
            <span>{primaryHeader}</span>
            {onSortChange && (
              <ArrowUpDown
                className={`w-3 h-3 ${
                  sortColumn === "primary" ? "text-red-400" : "text-slate-600"
                }`}
              />
            )}
          </div>
          <div
            onClick={() => onSortChange && onSortChange("secondary")}
            className={`flex items-center justify-end gap-1.5 ${
              onSortChange ? "cursor-pointer hover:text-slate-200" : ""
            }`}
          >
            <span>{secondaryHeader}</span>
            {onSortChange && (
              <ArrowUpDown
                className={`w-3 h-3 ${
                  sortColumn === "secondary" ? "text-red-400" : "text-slate-600"
                }`}
              />
            )}
          </div>
        </div>

        {/* Rows Content */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-red-500" />
            <span className="text-xs font-medium">Loading records...</span>
          </div>
        ) : data.length === 0 ? (
          <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
            {emptyState?.icon || <Inbox className="w-8 h-8 text-slate-600 mb-2" />}
            <h4 className="text-xs font-bold text-slate-300">
              {emptyState?.title || "No records found"}
            </h4>
            <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
              {emptyState?.message || "There are no matching entries to display."}
            </p>
            {emptyState?.action && <div className="mt-3">{emptyState.action}</div>}
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {data.map((item, index) => {
              const id = keyExtractor(item, index);
              const isExpanded = expandedId === id;

              return (
                <div key={id} className="transition-colors">
                  {/* Compact 2-Column Row (Entire Row is Tappable) */}
                  <div
                    onClick={() => handleRowClick(id)}
                    className={`grid grid-cols-2 px-4 py-3 items-center gap-2 cursor-pointer transition-colors active:bg-slate-800/50 ${
                      isExpanded ? "bg-slate-900/70" : "hover:bg-slate-900/40"
                    }`}
                  >
                    {/* Primary Column (Left) */}
                    <div className="flex items-center gap-2 min-w-0 pr-1">
                      <ChevronDown
                        className={`w-3.5 h-3.5 shrink-0 text-slate-500 transition-transform duration-200 ${
                          isExpanded ? "rotate-180 text-red-400" : ""
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        {renderPrimary(item, index)}
                      </div>
                    </div>

                    {/* Secondary Column (Right) */}
                    <div className="flex items-center justify-end min-w-0 pl-1">
                      {renderSecondary(item, index)}
                    </div>
                  </div>

                  {/* Expanded Accordion Drawer (Single-Expand Mode) */}
                  {isExpanded && (
                    <div className="px-4 pt-2 pb-3.5 bg-slate-950/60 border-t border-slate-800/40 animate-in slide-in-from-top-1 duration-150 space-y-3">
                      {/* 3-Item Quick Preview Container */}
                      <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 text-xs text-slate-300">
                        {renderPreview(item, index)}
                      </div>

                      {/* Row Action Buttons & Full Details Inspector CTA */}
                      <div className="flex items-center gap-2 pt-0.5">
                        {(inspectorSections || renderInspectorCustom) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectingItem(item);
                            }}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 active:scale-95 transition-all text-xs font-semibold min-h-[44px] cursor-pointer"
                          >
                            <Maximize2 className="w-3.5 h-3.5 text-red-400" />
                            <span>View Full Details</span>
                          </button>
                        )}

                        {renderRowActions && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-2 shrink-0"
                          >
                            {renderRowActions(item, index)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Mobile Pagination Toolbar (44px touch targets) */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 bg-slate-900/90 border-t border-slate-800/80 flex items-center justify-between gap-3 text-xs select-none">
            <button
              type="button"
              disabled={pagination.currentPage <= 1}
              onClick={() =>
                pagination.onPageChange(Math.max(1, pagination.currentPage - 1))
              }
              className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none min-h-[44px] active:scale-95 transition-all cursor-pointer font-medium"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Prev</span>
            </button>

            <span className="text-[11px] font-semibold text-slate-400 font-mono">
              Page {pagination.currentPage} of {pagination.totalPages}
              {pagination.totalItems !== undefined && (
                <span className="text-slate-500 font-normal ml-1">
                  ({pagination.totalItems})
                </span>
              )}
            </span>

            <button
              type="button"
              disabled={pagination.currentPage >= pagination.totalPages}
              onClick={() =>
                pagination.onPageChange(
                  Math.min(pagination.totalPages, pagination.currentPage + 1)
                )
              }
              className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none min-h-[44px] active:scale-95 transition-all cursor-pointer font-medium"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Dedicated Full-Screen Record Inspector View */}
      {inspectingItem && (
        <RecordInspectorView
          isOpen={Boolean(inspectingItem)}
          onClose={() => setInspectingItem(null)}
          title={
            inspectorTitle ? inspectorTitle(inspectingItem) : "Record Details"
          }
          subtitle={
            inspectorSubtitle ? inspectorSubtitle(inspectingItem) : undefined
          }
          statusBadge={
            inspectorStatusBadge
              ? inspectorStatusBadge(inspectingItem)
              : undefined
          }
          sections={
            inspectorSections ? inspectorSections(inspectingItem) : undefined
          }
          actions={
            inspectorActions
              ? inspectorActions(inspectingItem, () => setInspectingItem(null))
              : undefined
          }
        >
          {renderInspectorCustom &&
            renderInspectorCustom(inspectingItem, () => setInspectingItem(null))}
        </RecordInspectorView>
      )}
    </div>
  );
}

export default MobileResponsiveTable;
