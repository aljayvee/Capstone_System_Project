import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Component-based skeleton loading states for the Owner Portal.
 *
 * Each skeleton exactly reflects the geometry and semantic structure of its
 * loaded state, avoiding Cumulative Layout Shift (CLS) and replacing generic
 * spinners with professional, accessible place-holders.
 */

// ─── 1. USER MANAGEMENT SKELETON ─────────────────────────────────────────────
export interface UserTableSkeletonProps {
  rowCount?: number;
  className?: string;
}

export function UserTableSkeleton({ rowCount = 6, className }: UserTableSkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading user accounts"
      className={cn("w-full", className)}
    >
      <span className="sr-only">Loading user accounts...</span>

      {/* Desktop view table skeleton */}
      <div className="hidden md:block">
        <table className="w-full text-left text-label text-ink">
          <thead className="sticky top-0 z-10 select-none border-b border-hairline bg-board-ground text-micro uppercase text-ink-muted">
            <tr>
              <th scope="col" className="p-4">User Profile</th>
              <th scope="col" className="p-4">Assigned Role</th>
              <th scope="col" className="p-4">Username</th>
              <th scope="col" className="p-4">Contact Phone</th>
              <th scope="col" className="p-4">Account Status</th>
              <th scope="col" className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {Array.from({ length: rowCount }).map((_, i) => (
              <tr key={i} className="transition-colors hover:bg-board-ground/40">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-10 rounded-full bg-hairline shrink-0" />
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <Skeleton className="h-4 w-28 rounded-trim bg-hairline" />
                      <Skeleton className="h-3 w-36 rounded-trim bg-hairline/60" />
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <Skeleton className="h-6 w-24 rounded-full bg-hairline" />
                </td>
                <td className="p-4">
                  <Skeleton className="h-4 w-20 rounded-trim bg-hairline font-mono" />
                </td>
                <td className="p-4">
                  <Skeleton className="h-4 w-24 rounded-trim bg-hairline font-mono" />
                </td>
                <td className="p-4">
                  <Skeleton className="h-5 w-16 rounded-full bg-hairline" />
                </td>
                <td className="p-4 text-right">
                  <Skeleton className="h-8 w-16 rounded-plate bg-hairline ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile responsive cards skeleton */}
      <div className="md:hidden space-y-3 p-3">
        {Array.from({ length: Math.min(rowCount, 4) }).map((_, i) => (
          <div
            key={i}
            className="rounded-plate border border-edge bg-board-plate p-3.5 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <Skeleton className="size-10 rounded-full bg-hairline shrink-0" />
                <div className="space-y-1 min-w-0">
                  <Skeleton className="h-3.5 w-28 rounded-trim bg-hairline" />
                  <Skeleton className="h-2.5 w-16 rounded-trim bg-hairline/60" />
                </div>
              </div>
              <Skeleton className="h-5 w-14 rounded-full bg-hairline shrink-0" />
            </div>
            <div className="space-y-2 pt-2 border-t border-hairline">
              <div className="flex justify-between items-center">
                <Skeleton className="h-3 w-12 rounded-trim bg-hairline/60" />
                <Skeleton className="h-3 w-32 rounded-trim bg-hairline" />
              </div>
              <div className="flex justify-between items-center">
                <Skeleton className="h-3 w-12 rounded-trim bg-hairline/60" />
                <Skeleton className="h-3 w-24 rounded-trim bg-hairline font-mono" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 2. MERCHANT CATEGORIES LIST SKELETON ─────────────────────────────────────
export interface CategoryListSkeletonProps {
  rowCount?: number;
}

export function CategoryListSkeleton({ rowCount = 5 }: CategoryListSkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading merchant categories"
      className="flex-1 min-h-0 overflow-y-auto divide-y divide-hairline"
    >
      <span className="sr-only">Loading merchant categories...</span>
      {Array.from({ length: rowCount }).map((_, i) => (
        <div
          key={i}
          className="py-4 sm:px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          {/* Left & Middle: Thumbnail + Category details */}
          <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
            <Skeleton className="w-24 h-16 sm:h-20 rounded-plate bg-hairline shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-36 rounded-trim bg-hairline" />
              <Skeleton className="h-3.5 w-full max-w-sm rounded-trim bg-hairline/70" />
              <div className="flex items-center gap-2 pt-0.5">
                <Skeleton className="h-3 w-24 rounded-trim bg-hairline/50" />
                <span className="text-edge">·</span>
                <Skeleton className="h-3 w-28 rounded-trim bg-hairline/50" />
              </div>
            </div>
          </div>

          {/* Right: Store count pill + Edit button */}
          <div className="flex items-center justify-end gap-2 shrink-0">
            <Skeleton className="h-9 w-24 rounded-plate bg-hairline" />
            <Skeleton className="h-9 w-18 rounded-plate bg-hairline" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── 3. PLACES DIRECTORY TABLE SKELETON ───────────────────────────────────────
export interface PlacesTableSkeletonProps {
  rowCount?: number;
  className?: string;
}

export function PlacesTableSkeleton({ rowCount = 6, className }: PlacesTableSkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading verified directory"
      className={cn("w-full", className)}
    >
      <span className="sr-only">Loading verified directory...</span>

      {/* Desktop view table skeleton */}
      <div className="hidden md:block">
        <table className="w-full text-left text-label text-ink">
          <thead className="sticky top-0 z-10 select-none border-b border-hairline bg-board-ground text-micro uppercase text-ink-muted">
            <tr>
              <th scope="col" className="p-4">Establishment / Store</th>
              <th scope="col" className="p-4">Category</th>
              <th scope="col" className="p-4">Barangay & Address</th>
              <th scope="col" className="p-4">Opening Hours</th>
              <th scope="col" className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {Array.from({ length: rowCount }).map((_, i) => (
              <tr key={i} className="transition-colors hover:bg-board-ground/40">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-10 rounded-plate bg-hairline shrink-0" />
                    <div className="space-y-1.5 min-w-0">
                      <Skeleton className="h-4 w-36 rounded-trim bg-hairline" />
                      <Skeleton className="h-3 w-24 rounded-trim bg-hairline/60" />
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <Skeleton className="h-4 w-20 rounded-trim bg-hairline" />
                </td>
                <td className="p-4">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-28 rounded-trim bg-hairline" />
                    <Skeleton className="h-3 w-40 rounded-trim bg-hairline/60" />
                  </div>
                </td>
                <td className="p-4">
                  <Skeleton className="h-4 w-28 rounded-trim bg-hairline" />
                </td>
                <td className="p-4 text-right whitespace-nowrap">
                  <div className="inline-flex items-center gap-1.5 justify-end">
                    <Skeleton className="h-8 w-16 rounded-plate bg-hairline" />
                    <Skeleton className="h-8 w-18 rounded-plate bg-hairline" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile responsive cards skeleton */}
      <div className="md:hidden space-y-3 p-3">
        {Array.from({ length: Math.min(rowCount, 4) }).map((_, i) => (
          <div
            key={i}
            className="rounded-plate border border-edge bg-board-plate p-3.5 space-y-3"
          >
            <div className="flex items-center gap-2.5">
              <Skeleton className="size-10 rounded-plate bg-hairline shrink-0" />
              <div className="space-y-1 flex-1 min-w-0">
                <Skeleton className="h-3.5 w-32 rounded-trim bg-hairline" />
                <Skeleton className="h-2.5 w-20 rounded-trim bg-hairline/60" />
              </div>
              <Skeleton className="h-4 w-16 rounded-trim bg-hairline shrink-0" />
            </div>
            <div className="space-y-1.5 pt-2 border-t border-hairline">
              <div className="flex justify-between items-center">
                <Skeleton className="h-3 w-16 rounded-trim bg-hairline/60" />
                <Skeleton className="h-3 w-28 rounded-trim bg-hairline" />
              </div>
              <div className="flex justify-between items-center">
                <Skeleton className="h-3 w-12 rounded-trim bg-hairline/60" />
                <Skeleton className="h-3 w-24 rounded-trim bg-hairline" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 4. SERVICE RATES SKELETON ────────────────────────────────────────────────
export function ServiceRatesSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading service rates configuration"
      className="grid max-w-5xl grid-cols-1 gap-4 lg:grid-cols-2"
    >
      <span className="sr-only">Loading service rates configuration...</span>
      {Array.from({ length: 6 }).map((_, i) => (
        <section
          key={i}
          className="min-w-0 rounded-plate border border-edge bg-board-plate p-4 sm:p-5 space-y-4"
        >
          {/* Card Header: Icon + Title + Edit Button placeholder */}
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <Skeleton className="size-8 rounded-trim bg-hairline shrink-0" />
              <Skeleton className="h-4 w-44 rounded-trim bg-hairline" />
            </div>
            <Skeleton className="size-9 rounded-trim bg-hairline shrink-0" />
          </div>

          {/* Card Definition List: matches RatesCardsView dl */}
          {i < 4 ? (
            <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-hairline pb-2.5">
              <Skeleton className="h-4 w-28 rounded-trim bg-hairline/70" />
              <Skeleton className="h-7 w-24 rounded-trim bg-hairline font-mono" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
              {Array.from({ length: 3 }).map((_, fIdx) => (
                <div
                  key={fIdx}
                  className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-hairline pb-2.5"
                >
                  <Skeleton className="h-3.5 w-24 rounded-trim bg-hairline/70" />
                  <Skeleton className="h-6 w-16 rounded-trim bg-hairline font-mono" />
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

// ─── 5. RIDER FLEET ROSTER SKELETON ───────────────────────────────────────────
export interface RiderRosterSkeletonProps {
  rowCount?: number;
  className?: string;
}

export function RiderRosterSkeleton({ rowCount = 6, className }: RiderRosterSkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Streaming live rider fleet"
      className={cn("divide-y divide-hairline w-full", className)}
    >
      <span className="sr-only">Streaming live rider fleet...</span>
      {Array.from({ length: rowCount }).map((_, i) => (
        <div key={i} className="px-3.5 py-3 space-y-2">
          {/* Row 1: presence dot + name + ID + status badge */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Skeleton className="size-2 rounded-full bg-hairline shrink-0" />
              <Skeleton className="h-4 w-28 rounded-trim bg-hairline" />
              <Skeleton className="h-3 w-8 rounded-trim bg-hairline/60 font-mono" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full bg-hairline shrink-0" />
          </div>

          {/* Row 2: Telemetry details (Phone, Battery/Orders) */}
          <div className="flex items-center justify-between pl-4">
            <Skeleton className="h-3 w-24 rounded-trim bg-hairline/60 font-mono" />
            <Skeleton className="h-3 w-16 rounded-trim bg-hairline/60" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── 6. ARCHIVED PLACES SKELETON ──────────────────────────────────────────────
export interface ArchivedPlacesSkeletonProps {
  rowCount?: number;
}

export function ArchivedPlacesSkeleton({ rowCount = 4 }: ArchivedPlacesSkeletonProps) {
  return (
    <ul
      role="status"
      aria-busy="true"
      aria-label="Loading retired stores"
      className="divide-y divide-hairline m-0 p-0 list-none"
    >
      <span className="sr-only">Loading retired stores...</span>
      {Array.from({ length: rowCount }).map((_, i) => (
        <li key={i} className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Skeleton className="size-4 rounded-trim bg-hairline shrink-0" />
            <div className="space-y-1 min-w-0 flex-1">
              <Skeleton className="h-4 w-36 rounded-trim bg-hairline" />
              <Skeleton className="h-3 w-24 rounded-trim bg-hairline/60" />
            </div>
          </div>
          <Skeleton className="h-8 w-20 rounded-plate bg-hairline shrink-0" />
        </li>
      ))}
    </ul>
  );
}

// ─── 7. CATEGORY PLACES SKELETON ──────────────────────────────────────────────
export interface CategoryPlacesSkeletonProps {
  count?: number;
  className?: string;
}

export function CategoryPlacesSkeleton({ count = 3, className }: CategoryPlacesSkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading location stores"
      className={cn("border border-edge rounded-plate overflow-hidden bg-board-plate", className)}
    >
      <span className="sr-only">Loading location stores...</span>
      <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-board-ground border-b border-edge">
        <div className="flex items-center gap-2">
          <Skeleton className="size-3.5 rounded-sm bg-hairline shrink-0" />
          <Skeleton className="h-3 w-40 rounded-trim bg-hairline" />
        </div>
      </div>
      <div className="divide-y divide-hairline">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 px-3.5 py-2.5"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <Skeleton className="size-6 rounded-trim bg-hairline shrink-0" />
              <div className="space-y-1 min-w-0 flex-1">
                <Skeleton className="h-3.5 w-32 rounded-trim bg-hairline" />
                <Skeleton className="h-2.5 w-44 rounded-trim bg-hairline/60" />
              </div>
            </div>
            <Skeleton className="h-5 w-14 rounded-full bg-hairline shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 8. REVENUE PLOT SKELETON ─────────────────────────────────────────────────
export function RevenuePlotSkeleton() {
  const barHeights = [40, 65, 50, 80, 55, 90, 70, 85, 60, 75, 45, 68];
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading sales chart"
      className="h-[240px] w-full flex flex-col justify-end p-4 pt-6 space-y-3"
    >
      <span className="sr-only">Loading sales chart...</span>
      {/* Bars container */}
      <div className="flex items-end justify-between gap-2 h-full w-full border-b border-hairline pb-2 px-2">
        {barHeights.map((pct, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
            <Skeleton
              className="w-full max-w-[28px] rounded-t-trim bg-hairline"
              style={{ height: `${pct}%` }}
            />
          </div>
        ))}
      </div>
      {/* X-axis labels */}
      <div className="flex justify-between px-2">
        <Skeleton className="h-2.5 w-10 rounded-trim bg-hairline/60" />
        <Skeleton className="h-2.5 w-10 rounded-trim bg-hairline/60" />
        <Skeleton className="h-2.5 w-10 rounded-trim bg-hairline/60" />
        <Skeleton className="h-2.5 w-10 rounded-trim bg-hairline/60" />
      </div>
    </div>
  );
}

// ─── 9. SUMMARY CHARTS SKELETON ───────────────────────────────────────────────
export function SummaryChartSkeleton({ type = "bars" }: { type?: "bars" | "mix" }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading summary chart"
      className="h-[200px] w-full flex flex-col justify-center p-4 space-y-3"
    >
      <span className="sr-only">Loading summary chart...</span>
      {type === "bars" ? (
        <div className="space-y-3 w-full">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-20 rounded-trim bg-hairline" />
                <Skeleton className="h-3 w-12 rounded-trim bg-hairline/60" />
              </div>
              <Skeleton
                className="h-3 rounded-full bg-hairline"
                style={{ width: `${85 - idx * 18}%` }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4 w-full">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-28 rounded-trim bg-hairline" />
              <Skeleton className="h-3 w-16 rounded-trim bg-hairline/60" />
            </div>
            <Skeleton className="h-5 w-full rounded-plate bg-hairline" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-32 rounded-trim bg-hairline" />
              <Skeleton className="h-3 w-16 rounded-trim bg-hairline/60" />
            </div>
            <Skeleton className="h-5 w-full rounded-plate bg-hairline" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 10. GOOGLE PLACE SEARCH RESULTS SKELETON ─────────────────────────────────
export interface GooglePlaceResultsSkeletonProps {
  count?: number;
}

export function GooglePlaceResultsSkeleton({ count = 3 }: GooglePlaceResultsSkeletonProps) {
  return (
    <ul
      role="status"
      aria-busy="true"
      aria-label="Searching Google Maps"
      className="m-0 max-h-60 list-none divide-y divide-hairline overflow-y-auto rounded-plate border border-edge p-0"
    >
      <span className="sr-only">Searching Google Maps...</span>
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="flex w-full items-start gap-2.5 px-3 py-2.5">
          <Skeleton className="size-4 rounded-full bg-hairline shrink-0 mt-0.5" />
          <div className="space-y-1.5 min-w-0 flex-1">
            <Skeleton className="h-3.5 w-44 rounded-trim bg-hairline" />
            <Skeleton className="h-2.5 w-60 rounded-trim bg-hairline/60" />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ─── 11. REPORTS SUMMARY LIST SKELETON ────────────────────────────────────────
export interface ReportsSummarySkeletonProps {
  count?: number;
}

export function ReportsSummarySkeleton({ count = 6 }: ReportsSummarySkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading reports summary"
      className="divide-y divide-hairline"
    >
      <span className="sr-only">Loading reports summary...</span>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Skeleton className="size-9 rounded-lg bg-hairline shrink-0" />
            <div className="min-w-0 space-y-1.5 flex-1">
              <Skeleton className="h-4 w-32 rounded-trim bg-hairline" />
              <Skeleton className="h-3 w-48 rounded-trim bg-hairline/60" />
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 pl-11 sm:pl-0">
            <div className="text-right space-y-1">
              <Skeleton className="h-5 w-20 rounded-trim bg-hairline ml-auto font-mono" />
              <Skeleton className="h-2.5 w-16 rounded-trim bg-hairline/60 ml-auto" />
            </div>
            <Skeleton className="h-8 w-16 rounded-lg bg-hairline" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── 12. OWNER WORKSPACE SKELETON ─────────────────────────────────────────────
export interface OwnerWorkspaceSkeletonProps {
  hasStandingFigures?: boolean;
}

export function OwnerWorkspaceSkeleton({ hasStandingFigures = false }: OwnerWorkspaceSkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading workspace"
      className="flex flex-col h-full w-full space-y-4"
    >
      <span className="sr-only">Loading workspace...</span>
      {/* Shell Header Skeleton */}
      <div className="flex items-center justify-between pb-3 border-b border-hairline shrink-0">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-48 rounded-trim bg-hairline" />
          <Skeleton className="h-4 w-72 rounded-trim bg-hairline/60" />
        </div>
        <Skeleton className="h-9 w-28 rounded-plate bg-hairline" />
      </div>

      {/* Standing Figures Band Skeleton (only when the target module has standing figures) */}
      {hasStandingFigures && (
        <div className="grid grid-cols-1 sm:grid-cols-3 rounded-plate bg-board-field p-3 gap-3 shrink-0">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="px-3 py-1 space-y-1.5">
              <Skeleton className="h-3 w-24 rounded-trim bg-white/20" />
              <Skeleton className="h-6 w-16 rounded-trim bg-white/40" />
              <Skeleton className="h-3 w-28 rounded-trim bg-white/20" />
            </div>
          ))}
        </div>
      )}

      {/* Content Area Skeleton */}
      <div className="flex-1 min-h-[300px] rounded-plate border border-edge bg-board-plate p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-hairline">
          <Skeleton className="h-9 w-64 rounded-plate bg-hairline/80" />
          <Skeleton className="h-9 w-32 rounded-plate bg-hairline/60" />
        </div>
        <div className="space-y-3 pt-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-plate bg-hairline/50" />
          ))}
        </div>
      </div>
    </div>
  );
}
