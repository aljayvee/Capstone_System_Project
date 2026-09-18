import { useState, useMemo } from "react";
import { formatErrandId } from "../../../utils/formatErrandId";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { DispatcherSearchField } from "@/components/panel/DispatcherSearchField";
import { DispatcherButton } from "@/components/panel/DispatcherButton";
import { StatusChip } from "@/components/panel/DispatcherBadge";
import { PanelShell } from "@/components/panel/PanelShell";
import { PanelState } from "@/components/panel/PanelState";

const STATUS_FILTERS = [
  { id: "ALL", label: "All" },
  { id: "ASSIGNED", label: "Assigned" },
  { id: "IN_TRANSIT", label: "In transit" },
  { id: "DELIVERED", label: "Delivered" },
  { id: "CANCELLED", label: "Cancelled" },
];

const ITEMS_PER_PAGE = 10;

interface RecentChatsPanelProps {
  errands: any[];
  onOpenChat: (orderId: string) => void;
  /** Additive, all optional. */
  isLoading?: boolean;
  loadError?: string | null;
  onRetry?: () => void;
}

/** Underscores and spacing vary between the API and this filter's ids. */
const normalizeStatus = (s: unknown) =>
  String(s ?? "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().toUpperCase();

export function RecentChatsPanel({
  errands,
  onOpenChat,
  isLoading = false,
  loadError = null,
  onRetry,
}: RecentChatsPanelProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const closedErrands = useMemo(() => {
    return errands.filter((e) => {
      const s = normalizeStatus(e.status);
      // AVAILABLE is unclaimed — no dispatcher conversation exists yet.
      // PENDING is claimed and actively being worked (see errandService's
      // claimErrand): the dispatcher is right now pinning stores, editing
      // items, or otherwise mid-conversation. Neither belongs in a "recent"
      // history list — that's ActiveErrandsPanel's job, and letting a
      // currently-active chat also show up here made it look closed when it
      // very much was not.
      return s !== "AVAILABLE" && s !== "PENDING";
    });
  }, [errands]);

  const filteredErrands = useMemo(() => {
    return closedErrands.filter((e) => {
      // Both sides normalised. The filter compared a raw value against
      // "IN_TRANSIT", so a run the API calls "IN TRANSIT" or "IN ROUTE" was
      // silently unmatchable by the filter offering that exact label.
      const matchesStatus =
        statusFilter === "ALL" || normalizeStatus(e.status) === normalizeStatus(statusFilter);
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

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filteredErrands.length / ITEMS_PER_PAGE));
  const paginatedErrands = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredErrands.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredErrands, currentPage]);

  const hasFilters = statusFilter !== "ALL" || search.trim().length > 0;

  const resetFilters = () => {
    setStatusFilter("ALL");
    setSearch("");
    setCurrentPage(1);
  };

  const pageButton = (dir: "prev" | "next") => {
    const disabled = dir === "prev" ? currentPage <= 1 : currentPage >= totalPages;
    return (
      <DispatcherButton
        variant="secondary"
        size="sm"
        iconOnly
        aria-label={dir === "prev" ? "Previous page" : "Next page"}
        disabled={disabled}
        icon={dir === "prev" ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        onClick={() =>
          setCurrentPage((p) => (dir === "prev" ? Math.max(1, p - 1) : Math.min(totalPages, p + 1)))
        }
      />
    );
  };

  return (
    <PanelShell
      title="Customer chats"
      figure={{
        label: "Conversations",
        value: isLoading || loadError ? "--" : String(closedErrands.length),
      }}
      // Says what the filter actually does. `closedErrands` excludes only
      // AVAILABLE and PENDING, so runs still on the road are listed here too,
      // and describing this as finished-or-closed would have been a claim the
      // list does not honour.
      detail="Every run that has been claimed, newest first"
      aside={
        <div className="w-full sm:w-72">
          <DispatcherSearchField
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search route number, customer, store"
            aria-label="Search conversations"
          />
        </div>
      }
      controls={
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_FILTERS.map((f) => {
            const isActive = statusFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => handleStatusFilterChange(f.id)}
                aria-pressed={isActive}
                className={cn(
                  "min-h-9 cursor-pointer rounded-trim px-3 text-micro uppercase transition-colors",
                  isActive
                    ? "bg-board-field text-board-plate"
                    : "bg-board-plate text-ink-muted hover:text-ink"
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      }
      footer={
        filteredErrands.length > 0 ? (
          <div className="flex flex-col items-center justify-between gap-2 rounded-plate border border-edge bg-board-plate px-4 py-2.5 sm:flex-row">
            <p data-figure className="text-label text-ink-muted">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredErrands.length)} of{" "}
              {filteredErrands.length}
            </p>
            <div className="flex items-center gap-2">
              {pageButton("prev")}
              <span data-figure className="px-1 text-label text-ink">
                Page {currentPage} of {totalPages}
              </span>
              {pageButton("next")}
            </div>
          </div>
        ) : null
      }
    >
      <div className="overflow-hidden rounded-plate border border-edge bg-board-plate">
        <PanelState
          isLoading={isLoading}
          error={loadError}
          onRetry={onRetry}
          isEmpty={filteredErrands.length === 0}
          hasFilters={hasFilters}
          onResetFilters={resetFilters}
          emptyTitle="No conversations yet"
          emptyBody="A conversation appears here once a run has been claimed."
          errorTitle="The conversation history did not load"
          loadingRows={5}
        >
          {/* overflow-x-auto is the table's own, so a wide table scrolls
              sideways inside the plate instead of widening the page. */}
          <div className="overflow-x-auto">
            {/* table-fixed with explicit column widths. Without it the cells
                sized themselves from their content, so one long customer name
                or store category set the width of the whole table. */}
            <table className="w-full table-fixed text-left">
              <colgroup>
                <col className="w-[18%]" />
                <col className="w-[30%]" />
                <col className="w-[20%]" />
                <col className="w-[18%]" />
                <col className="w-[14%]" />
              </colgroup>
              <thead className="border-b border-hairline bg-board-ground">
                <tr>
                  <th className="px-4 py-2.5 text-micro uppercase text-ink-muted">Route</th>
                  <th className="px-4 py-2.5 text-micro uppercase text-ink-muted">Customer</th>
                  <th className="px-4 py-2.5 text-micro uppercase text-ink-muted">Category</th>
                  <th className="px-4 py-2.5 text-micro uppercase text-ink-muted">Status</th>
                  <th className="px-4 py-2.5 text-right text-micro uppercase text-ink-muted">
                    <span className="sr-only">Open the conversation</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {paginatedErrands.map((e) => (
                  <tr key={e.id} className="transition-colors hover:bg-board-ground">
                    <td data-figure className="truncate px-4 py-3 font-mono text-label text-ink">
                      {formatErrandId(e.id)}
                    </td>
                    <td className="truncate px-4 py-3 text-body text-ink">
                      {e.customerName || "Customer"}
                    </td>
                    <td className="truncate px-4 py-3 text-body text-ink-muted">
                      {e.category || "General errand"}
                    </td>
                    <td className="px-4 py-3">
                      {/* Was the raw value in a locally-computed colour. */}
                      <StatusChip status={e.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DispatcherButton
                        variant="secondary"
                        size="sm"
                        icon={<Eye size={14} />}
                        onClick={() => onOpenChat(e.id)}
                      >
                        Open
                      </DispatcherButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PanelState>
      </div>
    </PanelShell>
  );
}
