import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Pencil,
  Users,
  ShieldCheck,
  Bike,
  Headphones,
  Search,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  Loader2,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  LayoutGrid,
  Table as TableIcon,
  X,
  Copy,
  Check,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { AddUserModal } from "./components/AddUserModal";
import { EditUserModal } from "./components/EditUserModal";
import { UserRole } from "../../../../types/auth";
import { apiService } from "../../../../services/apiService";
import { NotificationBell } from "../../../../components/NotificationBell";
import { HeaderClock } from "../../../../components/HeaderClock";
import { StaffAvatar } from "../../../../components/StaffAvatar";
import { ROLE_BADGE_LABELS, ROLE_SORT_RANK } from "../../../../constants/userRoles";

export interface UserRecord {
  id: number;
  name: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  role: UserRole;
  status: "Active" | "Inactive";
  version: number;
}

type SortKey = "name" | "role" | "username" | "phone" | "status";
type SortDirection = "asc" | "desc";
type ViewMode = "auto" | "table" | "cards";

export const UserManagementModule: React.FC = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<"ALL" | UserRole>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "Active" | "Inactive">("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [viewMode, setViewMode] = useState<ViewMode>("auto");

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadBackendUsers = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const backendUsers = await apiService.getUsers();
      if (backendUsers) {
        setUsers(
          backendUsers.map((u) => ({
            id: u.id,
            name: u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username,
            firstName: u.firstName,
            middleName: u.middleName,
            lastName: u.lastName,
            username: u.username,
            email: u.email,
            phone: u.phone,
            role: u.role.toLowerCase() as UserRole,
            status: u.status || "Active",
            version: u.version,
          })),
        );
      } else {
        setLoadError("The user accounts did not load.");
      }
    } catch (err: any) {
      setLoadError("The user accounts did not load.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBackendUsers();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success(`Copied "${text}" to clipboard`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddUser = async (newUserData: {
    firstName: string;
    middleName?: string;
    lastName: string;
    username: string;
    email: string;
    phone: string;
    role: UserRole;
    password?: string;
  }) => {
    try {
      const created = await apiService.createUser(newUserData);
      if (created) {
        await loadBackendUsers();
        toast.success("New personnel account created successfully!");
        return true;
      }
      return false;
    } catch (err: any) {
      throw err;
    }
  };

  const handleEditUser = async (
    updatedData: Partial<{
      firstName: string;
      middleName: string;
      lastName: string;
      username: string;
      email: string;
      phone: string;
      role: UserRole;
      status: "Active" | "Inactive";
      password: string;
      adminUsername: string;
      adminPassword: string;
    }> & { id: number; version: number },
  ) => {
    try {
      const updated = await apiService.updateUser(updatedData.id, updatedData);
      if (updated) {
        await loadBackendUsers();
        toast.success("User details updated successfully!");
        return true;
      }
      return false;
    } catch (err: any) {
      if (err?.isConflict) {
        toast.error("Someone else just updated this user. Refreshing the list.");
        await loadBackendUsers();
      }
      throw err;
    }
  };

  // Metrics computation for at-a-glance cognitive summary
  const totalUsers = users.length;
  // One judgement for every count this screen prints. A count is reportable
  // only when the list behind it actually arrived.
  const countsUnknown = loadError !== null && users.length === 0;
  const totalAdmins = useMemo(() => users.filter((u) => u.role === "owner").length, [users]);
  const totalDispatchers = useMemo(
    () => users.filter((u) => u.role === "dispatcher").length,
    [users],
  );
  const totalRiders = useMemo(() => users.filter((u) => u.role === "rider").length, [users]);
  const activeUsers = useMemo(() => users.filter((u) => u.status === "Active").length, [users]);

  // Filtered Users list
  const filteredUsers = users.filter((u) => {
    const matchesRole = selectedRole === "ALL" || u.role === selectedRole;
    const matchesStatus = statusFilter === "ALL" || u.status === statusFilter;
    if (!matchesRole || !matchesStatus) return false;

    const q = search.trim().toLowerCase();
    if (!q) return true;

    return (
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.phone.includes(q)
    );
  });

  const sortedUsers = useMemo(() => {
    const direction = sortDirection === "asc" ? 1 : -1;

    const compare = (a: UserRecord, b: UserRecord): number => {
      switch (sortKey) {
        case "role":
          return (ROLE_SORT_RANK[a.role] ?? 99) - (ROLE_SORT_RANK[b.role] ?? 99);
        case "username":
          return a.username.localeCompare(b.username, undefined, { sensitivity: "base" });
        case "phone":
          return (a.phone || "").localeCompare(b.phone || "");
        case "status":
          return (a.status === "Active" ? 0 : 1) - (b.status === "Active" ? 0 : 1);
        case "name":
        default:
          return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      }
    };

    return [...filteredUsers].sort((a, b) => {
      const primary = compare(a, b);
      if (primary !== 0) return primary * direction;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
  }, [filteredUsers, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "owner":
        return {
          label: ROLE_BADGE_LABELS.owner,
          bg: "bg-board-ground",
          text: "text-ink",
          icon: ShieldCheck,
        };
      case "dispatcher":
        return {
          label: ROLE_BADGE_LABELS.dispatcher,
          bg: "bg-board-ground",
          text: "text-ink",
          icon: Headphones,
        };
      case "rider":
        return {
          label: ROLE_BADGE_LABELS.rider,
          bg: "bg-board-ground",
          text: "text-ink",
          icon: Bike,
        };
      default:
        return {
          label: role,
          bg: "bg-board-ground",
          text: "text-ink",
          icon: Users,
        };
    }
  };

  /**
   * The sort control. `aria-sort` is NOT set here: the attribute belongs on
   * the `<th>` that owns the columnheader role, and setting it on a nested
   * button is a spec violation a screen reader simply ignores. SortTh below
   * carries it.
   */
  const SortButton: React.FC<{ label: string; sortBy: SortKey; className?: string }> = ({
    label,
    sortBy,
    className = "",
  }) => {
    const isActive = sortKey === sortBy;
    const Icon = !isActive ? ArrowUpDown : sortDirection === "asc" ? ArrowUp : ArrowDown;
    return (
      <button
        type="button"
        onClick={() => handleSort(sortBy)}
        title={`Sort by ${label}`}
        className={`group inline-flex items-center gap-1 rounded-trim px-2 py-1 -ml-2 uppercase text-micro transition ${
          isActive
            ? "text-board-field bg-board-ground"
            : "text-ink-muted hover:text-ink hover:bg-board-ground"
        } ${className}`}
      >
        <span>{label}</span>
        <Icon
          size={12}
          className={isActive ? "opacity-100" : "opacity-40 group-hover:opacity-80"}
        />
      </button>
    );
  };

  /** A column head whose aria-sort reflects the live sort state. */
  const SortTh: React.FC<{ label: string; sortBy: SortKey; className?: string }> = ({
    label,
    sortBy,
    className = "",
  }) => (
    <th
      scope="col"
      aria-sort={
        sortKey === sortBy ? (sortDirection === "asc" ? "ascending" : "descending") : "none"
      }
      className={className}
    >
      <SortButton label={label} sortBy={sortBy} />
    </th>
  );

  const resetFilters = () => {
    setSearch("");
    setSelectedRole("ALL");
    setStatusFilter("ALL");
    setSortKey("name");
    setSortDirection("asc");
  };

  return (
    <div className="flex flex-col h-full space-y-2.5 max-w-7xl mx-auto w-full overflow-hidden">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER & PRIMARY ACTION (STATIC NON-SCROLLING) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-end justify-between gap-2.5 border-b border-hairline pb-3">
        <div>
          <div className="flex items-center gap-2.5">
            <div>
              <h1 className="truncate text-title uppercase text-ink">User Management</h1>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-2.5 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <HeaderClock />
            <NotificationBell />
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 bg-board-field hover:bg-board-field-deep text-white text-label px-3.5 sm:px-4 py-2 rounded-plate transition-colors"
          >
            <Plus size={15} />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. SEARCH, FILTERS & VIEW TOGGLE (STATIC NON-SCROLLING) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-board-plate p-2.5 rounded-plate border border-edge">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
          {/* Search Bar with Clear Button */}
          <div className="relative flex-1 w-full">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
              size={15}
            />
            {/* aria-label, not a placeholder. A placeholder is the field's
                hint, not its name: it disappears the moment anyone types, and
                a screen reader announces an unnamed text box. */}
            <input
              type="text"
              aria-label="Search user accounts"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, username, email, or phone number..."
              className="w-full pl-9 pr-8 py-1.5 bg-board-ground border border-edge rounded-plate text-body text-ink placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-board-field/20 focus:border-board-field focus:bg-board-plate transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Right Controls: Role, Status, Sort & View Switcher */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto shrink-0">
            {/* Role Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-board-ground border border-edge px-2.5 py-1.5 rounded-plate">
              <Users size={14} className="text-ink-muted shrink-0" />
              <select
                aria-label="Filter by role"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as any)}
                className="bg-transparent text-label text-ink cursor-pointer"
              >
                {/* Guarded like every other count on this screen. These read
                    "All Roles (0)" over a failed request, which is a claim
                    about the business sitting next to a panel saying nothing
                    arrived. */}
                <option value="ALL">All Roles ({countsUnknown ? "--" : totalUsers})</option>
                <option value="dispatcher">
                  Dispatchers ({countsUnknown ? "--" : totalDispatchers})
                </option>
                <option value="rider">Riders ({countsUnknown ? "--" : totalRiders})</option>
                <option value="owner">Admins ({countsUnknown ? "--" : totalAdmins})</option>
              </select>
            </div>

            {/* Status Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-board-ground border border-edge px-2.5 py-1.5 rounded-plate">
              <CheckCircle2 size={14} className="text-ink-muted shrink-0" />
              <select
                aria-label="Filter by account status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-transparent text-label text-ink cursor-pointer"
              >
                <option value="ALL">All Status</option>
                <option value="Active">Active ({countsUnknown ? "--" : activeUsers})</option>
                <option value="Inactive">
                  Inactive ({countsUnknown ? "--" : totalUsers - activeUsers})
                </option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-board-ground border border-edge px-2.5 py-1.5 rounded-plate">
              <ArrowUpDown size={14} className="text-ink-muted shrink-0" />
              <select
                aria-label="Sort the directory"
                value={`${sortKey}-${sortDirection}`}
                onChange={(e) => {
                  const [key, dir] = e.target.value.split("-") as [SortKey, SortDirection];
                  setSortKey(key);
                  setSortDirection(dir);
                }}
                className="bg-transparent text-label text-ink cursor-pointer"
              >
                <option value="name-asc">Sort: Name (A → Z)</option>
                <option value="name-desc">Sort: Name (Z → A)</option>
                <option value="role-asc">Sort: Role (Admin first)</option>
                <option value="role-desc">Sort: Role (Rider first)</option>
                <option value="username-asc">Sort: Username (A → Z)</option>
                <option value="username-desc">Sort: Username (Z → A)</option>
                <option value="phone-asc">Sort: Phone (0 → 9)</option>
                <option value="phone-desc">Sort: Phone (9 → 0)</option>
                <option value="status-asc">Sort: Status (Active first)</option>
                <option value="status-desc">Sort: Status (Inactive first)</option>
              </select>
            </div>

            {/* View Switcher */}
            <div
              role="group"
              aria-label="Directory layout"
              className="flex items-center rounded-plate border border-edge bg-board-ground p-0.5"
            >
              {/* aria-label, not title alone. A title is announced
                  inconsistently and is invisible on a touchscreen, which this
                  portal is used on. aria-pressed reports which view is live:
                  it was carried by background colour only.

                  role="group" rather than a tablist, because these two do not
                  select a panel, they change how one panel is drawn. */}
              <button
                type="button"
                onClick={() => setViewMode("table")}
                aria-label="Table view"
                aria-pressed={viewMode === "table" || viewMode === "auto"}
                className={`rounded-trim p-1.5 transition-colors ${
                  viewMode === "table" || viewMode === "auto"
                    ? "bg-board-plate text-ink"
                    : "text-ink-muted hover:text-ink"
                }`}
                title="Table View"
              >
                <TableIcon size={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                aria-label="Card grid view"
                aria-pressed={viewMode === "cards"}
                className={`rounded-trim p-1.5 transition-colors ${
                  viewMode === "cards" ? "bg-board-plate text-ink" : "text-ink-muted hover:text-ink"
                }`}
                title="Cards Grid View"
              >
                <LayoutGrid size={14} />
              </button>
            </div>

            {/* Accounts Count */}
            {/* Guarded, because this toolbar sat directly above a panel saying
                "No accounts are shown because none arrived" while confidently
                reporting "0 of 0 accounts shown". One screen must not hold two
                answers to the same question. */}
            <span className="text-label text-ink-muted ml-1 hidden xl:inline">
              {countsUnknown
                ? "Account count unavailable"
                : `${sortedUsers.length} of ${totalUsers} account${totalUsers === 1 ? "" : "s"} shown`}
            </span>
          </div>
        </div>
      </div>

      {loadError && users.length > 0 && (
        <div className="shrink-0 bg-status-waiting-fill border border-status-waiting-ink/20 text-status-waiting-ink text-label px-4 py-2.5 rounded-plate flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. DIRECTORY CONTENT - ONLY THIS CONTAINER SCROLLS! */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex-1 min-h-0 bg-board-plate border border-edge rounded-plate p-12 text-center text-ink-muted flex flex-col items-center justify-center">
          <Loader2 size={28} className="animate-spin text-board-field" />
          <span className="text-label text-ink-muted mt-2">Loading user accounts...</span>
        </div>
      ) : /* Ordered BEFORE the empty branch. The amber banner above renders
         whenever loadError is set, but the empty branch used to render
         underneath it regardless, so a dead /users announced
         "No user accounts exist yet in the database." directly below a
         warning that the request had failed. Those are opposite claims,
         and the reassuring one was the larger of the two.

         Split on whether anything arrived: with stale rows on screen the
         banner alone is right, because the list is real if old. With
         nothing on screen the failure is the whole story. */
      users.length === 0 && loadError ? (
        <div className="flex-1 min-h-0 bg-board-plate border border-edge rounded-plate p-12 text-center space-y-3 flex flex-col items-center justify-center">
          <AlertCircle size={22} className="text-status-act-ink" />
          <div>
            <p className="text-panel text-ink">The user directory did not load</p>
            <p className="mt-1.5 max-w-sm mx-auto text-body text-ink-muted">
              {loadError} No accounts are shown because none arrived, not because none exist.
            </p>
          </div>
          <button
            onClick={loadBackendUsers}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-plate bg-signal px-4 text-micro uppercase text-board-plate transition-colors hover:bg-signal-deep"
          >
            <RotateCcw size={14} />
            <span>Try again</span>
          </button>
        </div>
      ) : sortedUsers.length === 0 ? (
        <div className="flex-1 min-h-0 bg-board-plate border border-edge rounded-plate p-12 text-center text-ink-muted space-y-3 flex flex-col items-center justify-center">
          <div>
            <p className=" text-ink text-panel">No user accounts found</p>
            <p className="text-label text-ink-muted mt-1 max-w-sm mx-auto">
              {search || selectedRole !== "ALL" || statusFilter !== "ALL"
                ? "No matching users found for your current filter query."
                : "No user accounts exist yet in the database."}
            </p>
          </div>
          {(search || selectedRole !== "ALL" || statusFilter !== "ALL") && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-plate bg-board-ground hover:bg-board-ground text-ink text-label transition"
            >
              <span>Reset All Filters</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* 5A. CARD GRID VIEW - SCROLLABLE */}
          <div
            className={`flex-1 min-h-0 overflow-y-auto pr-1 pb-4 ${
              viewMode === "cards" ? "block" : viewMode === "table" ? "hidden" : "block lg:hidden"
            }`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {sortedUsers.map((u) => {
                const roleBadge = getRoleBadge(u.role);
                const RoleIcon = roleBadge.icon;

                return (
                  <div
                    key={u.id}
                    className="bg-board-plate border border-edge rounded-plate p-4 flex flex-col justify-between gap-3 transition"
                  >
                    {/* Card Header: Avatar, Name, Role & Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <StaffAvatar userId={u.id} name={u.name} size={40} />
                        <div className="min-w-0">
                          <p className=" text-ink text-label truncate">{u.name}</p>
                          <p className="text-label font-mono text-ink-muted truncate">
                            @{u.username}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-micro uppercase border border-edge shrink-0 ${
                          u.status === "Active"
                            ? "bg-status-done-fill text-status-done-ink "
                            : "bg-board-ground text-ink-muted border-edge"
                        }`}
                      >
                        {u.status === "Active" ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                        <span>{u.status}</span>
                      </span>
                    </div>

                    {/* Card Meta & Contacts */}
                    <div className="space-y-1.5 text-label text-ink-muted bg-board-ground p-3 rounded-plate border border-hairline">
                      <div className="flex items-center justify-between">
                        <span className="text-label text-ink-muted">Role</span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-label border border-edge ${roleBadge.bg} ${roleBadge.text}`}
                        >
                          <RoleIcon size={12} />
                          <span>{roleBadge.label}</span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-edge">
                        <span className="text-label text-ink-muted">Phone</span>
                        <button
                          type="button"
                          onClick={() => u.phone && handleCopy(u.phone, `phone-${u.id}`)}
                          className="font-mono text-label text-ink hover:text-ink flex items-center gap-1"
                        >
                          <span>{u.phone || "--"}</span>
                          {u.phone && (
                            <span className="text-ink-muted">
                              {copiedId === `phone-${u.id}` ? (
                                <Check size={11} className="text-status-done-ink" />
                              ) : (
                                <Copy size={11} />
                              )}
                            </span>
                          )}
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-edge">
                        <span className="text-label text-ink-muted">Email</span>
                        <span className="text-body text-ink truncate max-w-[170px]" title={u.email}>
                          {u.email || "--"}
                        </span>
                      </div>
                    </div>

                    {/* Card Footer: Actions */}
                    <div className="pt-2 border-t border-hairline flex items-center justify-end">
                      <button
                        onClick={() => setEditingUser(u)}
                        className="w-full py-2 rounded-plate text-label bg-board-ground hover:bg-status-waiting-fill text-ink hover:text-status-waiting-ink border border-edge hover:border-status-waiting-ink/40 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Pencil size={13} />
                        <span>Edit User Details</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5B. DESKTOP TABULAR VIEW - SCROLLABLE TABLE ROWS */}
          <div
            className={`flex-1 min-h-0 bg-board-plate border border-edge rounded-plate overflow-hidden flex flex-col ${
              viewMode === "table" ? "block" : viewMode === "cards" ? "hidden" : "hidden lg:flex"
            }`}
          >
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto relative">
              <table className="w-full text-left text-label text-ink">
                {/* over an opaque fill blurred nothing while breaching
                    the [LOCKED] flat invariant; likewise. text-label
                    was under the 12px floor. */}
                <thead className="sticky top-0 z-10 select-none border-b border-edge bg-board-ground text-micro uppercase text-ink-muted">
                  <tr>
                    <SortTh label="User Profile" sortBy="name" className="p-4" />
                    <SortTh label="Assigned Role" sortBy="role" className="p-4" />
                    <SortTh label="Username" sortBy="username" className="p-4" />
                    <SortTh label="Contact Phone" sortBy="phone" className="p-4" />
                    <SortTh label="Account Status" sortBy="status" className="p-4" />
                    <th scope="col" className="p-4 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {sortedUsers.map((u) => {
                    const roleBadge = getRoleBadge(u.role);
                    const RoleIcon = roleBadge.icon;

                    return (
                      <tr key={u.id} className="hover:bg-board-ground transition group">
                        {/* Name & Email Avatar */}
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <StaffAvatar userId={u.id} name={u.name} size={40} />
                            <div className="min-w-0">
                              <p className=" text-ink text-label truncate">{u.name}</p>
                              <p className="text-label text-ink-muted truncate flex items-center gap-1 mt-0.5">
                                <Mail size={12} className="text-ink-muted" />
                                <span>{u.email || "No email provided"}</span>
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Role Badge */}
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label border border-edge ${roleBadge.bg} ${roleBadge.text}`}
                          >
                            <RoleIcon size={13} />
                            <span>{roleBadge.label}</span>
                          </span>
                        </td>

                        {/* Username */}
                        <td className="p-4 font-mono text-ink text-label">
                          <span className="bg-board-ground text-ink px-2 py-0.5 rounded-trim">
                            @{u.username}
                          </span>
                        </td>

                        {/* Phone */}
                        <td className="p-4 text-ink-muted font-mono text-label">
                          <button
                            type="button"
                            onClick={() => u.phone && handleCopy(u.phone, `table-phone-${u.id}`)}
                            className="flex items-center gap-1.5 hover:text-ink transition"
                            title="Click to copy phone"
                          >
                            <Phone size={12} className="text-ink-muted" />
                            <span>{u.phone || "--"}</span>
                            {u.phone && (
                              <span className="text-ink-muted">
                                {copiedId === `table-phone-${u.id}` ? (
                                  <Check size={11} className="text-status-done-ink" />
                                ) : (
                                  <Copy size={11} />
                                )}
                              </span>
                            )}
                          </button>
                        </td>

                        {/* Status */}
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-micro uppercase border border-edge ${
                              u.status === "Active"
                                ? "bg-status-done-fill text-status-done-ink "
                                : "bg-board-ground text-ink-muted border-edge"
                            }`}
                          >
                            {u.status === "Active" ? (
                              <CheckCircle2 size={10} />
                            ) : (
                              <XCircle size={10} />
                            )}
                            <span>{u.status}</span>
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setEditingUser(u)}
                            className="p-2 text-ink-muted hover:text-status-waiting-ink hover:bg-status-waiting-fill rounded-plate transition-colors border border-transparent hover:border-status-waiting-ink/40"
                            title="Edit User Details"
                          >
                            <Pencil size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <AddUserModal onClose={() => setShowAddModal(false)} onSave={handleAddUser} />
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={handleEditUser}
        />
      )}
    </div>
  );
};
