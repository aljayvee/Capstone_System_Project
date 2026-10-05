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
  X,
  Copy,
  Check,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { MobileResponsiveTable } from "../../../../components/table";
import { AddUserModal } from "./components/AddUserModal";
import { EditUserModal } from "./components/EditUserModal";
import { UserRole } from "../../../../types/auth";
import { apiService } from "../../../../services/apiService";
import { NotificationBell } from "../../../../components/NotificationBell";
import { HeaderClock } from "../../../../components/HeaderClock";
import { StaffAvatar } from "../../../../components/StaffAvatar";
import { ROLE_BADGE_LABELS, ROLE_SORT_RANK } from "../../../../constants/userRoles";
import { io, Socket } from "socket.io-client";

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
  isOnline?: boolean;
}

type SortKey = "name" | "role" | "username" | "phone" | "status";
type SortDirection = "asc" | "desc";

export const UserManagementModule: React.FC = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<"ALL" | UserRole>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "Active" | "Inactive">("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

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
            isOnline: Boolean(u.isOnline),
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

  // Listen for real-time presence changes from the backend Socket.IO server
  useEffect(() => {
    const backendUrl = (import.meta as any).env?.VITE_API_URL
      ? (import.meta as any).env.VITE_API_URL.replace(/\/api\/?$/, "")
      : "http://localhost:5000";

    const socket: Socket = io(backendUrl, {
      transports: ["websocket", "polling"],
    });

    socket.on("user:presence_changed", (payload: { userId?: number; isOnline?: boolean }) => {
      if (payload?.userId !== undefined) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === payload.userId ? { ...u, isOnline: Boolean(payload.isOnline) } : u
          )
        );
      }
    });

    return () => {
      socket.disconnect();
    };
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
      {/* 2. DIRECTORY CONTAINER (SINGLE COHESIVE FLAT PLATE) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 bg-board-plate rounded-plate border border-edge flex flex-col overflow-hidden">
        {/* Search, Filter & Sort Header Bar */}
        <div className="shrink-0 p-2.5 sm:p-3 border-b border-edge bg-board-ground space-y-2">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
            {/* Search Bar with Clear Button */}
            <div className="relative flex-1 w-full">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
                size={15}
              />
              <input
                type="text"
                aria-label="Search user accounts"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, username, email, or phone number..."
                className="w-full pl-9 pr-8 py-1.5 bg-board-plate border border-edge rounded-plate text-body text-ink placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-board-field transition"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Right Controls: Role, Status, Sort & Account Count */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Role Filter Dropdown */}
              <div className="flex items-center gap-1.5 bg-board-plate border border-edge px-2.5 py-1.5 rounded-plate">
                <Users size={14} className="text-ink-muted shrink-0" />
                <span className="text-label text-ink-muted">Role:</span>
                <select
                  aria-label="Filter by role"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as any)}
                  className="bg-transparent text-label text-ink cursor-pointer"
                >
                  <option value="ALL">All Roles ({countsUnknown ? "--" : totalUsers})</option>
                  <option value="dispatcher">
                    Dispatchers ({countsUnknown ? "--" : totalDispatchers})
                  </option>
                  <option value="rider">Riders ({countsUnknown ? "--" : totalRiders})</option>
                  <option value="owner">Admins ({countsUnknown ? "--" : totalAdmins})</option>
                </select>
              </div>

              {/* Status Filter Dropdown */}
              <div className="flex items-center gap-1.5 bg-board-plate border border-edge px-2.5 py-1.5 rounded-plate">
                <CheckCircle2 size={14} className="text-ink-muted shrink-0" />
                <span className="text-label text-ink-muted">Status:</span>
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
              <div className="flex items-center gap-1.5 bg-board-plate border border-edge px-2.5 py-1.5 rounded-plate">
                <ArrowUpDown size={14} className="text-ink-muted shrink-0" />
                <span className="text-label text-ink-muted">Sort:</span>
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
                  <option value="name-asc">Name (A → Z)</option>
                  <option value="name-desc">Name (Z → A)</option>
                  <option value="role-asc">Role (Admin first)</option>
                  <option value="role-desc">Role (Rider first)</option>
                  <option value="username-asc">Username (A → Z)</option>
                  <option value="username-desc">Username (Z → A)</option>
                  <option value="phone-asc">Phone (0 → 9)</option>
                  <option value="phone-desc">Phone (9 → 0)</option>
                  <option value="status-asc">Status (Active first)</option>
                  <option value="status-desc">Status (Inactive first)</option>
                </select>
              </div>

              {(search || selectedRole !== "ALL" || statusFilter !== "ALL") && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-2.5 py-1.5 rounded-plate border border-edge text-label text-ink-muted hover:text-ink hover:bg-board-ground transition"
                  title="Reset filters"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {loadError && users.length > 0 && (
          <div className="shrink-0 bg-status-waiting-fill border-b border-status-waiting-ink/20 text-status-waiting-ink text-label px-4 py-2.5 flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{loadError}</span>
          </div>
        )}

        {/* Directory Content Table Area */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto relative">
          {isLoading ? (
            <div className="h-full min-h-[300px] flex items-center justify-center p-12 text-ink-muted space-y-3 flex-col">
              <Loader2 size={28} className="animate-spin text-board-field" />
              <span className="text-label text-ink-muted">Loading user accounts...</span>
            </div>
          ) : users.length === 0 && loadError ? (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center space-y-3 p-12 text-center">
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
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-12 text-ink-muted space-y-3">
              <Users size={40} className="text-ink-muted" />
              <div>
                <p className="text-ink text-panel">No user accounts found</p>
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
            <MobileResponsiveTable<UserRecord>
              data={sortedUsers}
              keyExtractor={(u) => u.id}
              primaryHeader="User Profile"
              secondaryHeader="Role & Status"
              renderPrimary={(u) => (
                <div className="flex items-center gap-2.5 min-w-0">
                  <StaffAvatar userId={u.id} name={u.name} size={32} isOnline={u.isOnline} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink text-xs truncate">{u.name}</p>
                    <p className="text-[10px] text-ink-muted truncate font-mono">@{u.username}</p>
                  </div>
                </div>
              )}
              renderSecondary={(u) => {
                const roleBadge = getRoleBadge(u.role);
                return (
                  <div className="text-right shrink-0">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] uppercase font-semibold border border-edge ${
                        u.status === "Active"
                          ? "bg-status-done-fill text-status-done-ink"
                          : "bg-board-ground text-ink-muted border-edge"
                      }`}
                    >
                      {u.status}
                    </span>
                    <div className="text-[10px] text-ink-muted mt-0.5">
                      {roleBadge.label}
                    </div>
                  </div>
                );
              }}
              renderPreview={(u) => (
                <div className="space-y-1.5 pt-1 text-ink-muted">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-ink-muted">Email:</span>
                    <span className="text-ink font-medium truncate max-w-[200px]">{u.email || "--"}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-ink-muted">Phone:</span>
                    <button
                      type="button"
                      onClick={() => u.phone && handleCopy(u.phone, `mob-phone-${u.id}`)}
                      className="font-mono text-ink flex items-center gap-1 hover:underline"
                    >
                      <span>{u.phone || "--"}</span>
                      {u.phone && (
                        <span className="text-ink-muted">
                          {copiedId === `mob-phone-${u.id}` ? (
                            <Check size={11} className="text-status-done-ink" />
                          ) : (
                            <Copy size={11} />
                          )}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              )}
              renderRowActions={(u) => (
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setEditingUser(u)}
                    className="p-2 text-ink-muted hover:text-ink hover:bg-board-ground rounded-plate transition-colors"
                    title="Edit User Details"
                  >
                    <Pencil size={15} />
                  </button>
                </div>
              )}
              inspectorTitle={(u) => u.name}
              inspectorSubtitle={(u) => `@${u.username} · ${getRoleBadge(u.role).label}`}
              inspectorSections={(u) => [
                {
                  title: "Profile & Role",
                  items: [
                    { label: "Full Name", value: u.name },
                    { label: "Username", value: `@${u.username}` },
                    { label: "Assigned Role", value: getRoleBadge(u.role).label },
                    { label: "Status", value: u.status },
                  ],
                },
                {
                  title: "Contact Details",
                  items: [
                    { label: "Email", value: u.email || "Not provided", fullWidth: true },
                    { label: "Phone", value: u.phone || "Not provided" },
                  ],
                },
              ]}
              desktopView={
                <table className="w-full text-left text-label text-ink">
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
                              <StaffAvatar userId={u.id} name={u.name} size={40} isOnline={u.isOnline} />
                              <div className="min-w-0">
                                <p className="font-semibold text-ink text-label truncate">{u.name}</p>
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
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-micro font-medium border border-edge ${roleBadge.bg} ${roleBadge.text}`}
                            >
                              <RoleIcon size={12} />
                              <span>{roleBadge.label}</span>
                            </span>
                          </td>

                          {/* Username */}
                          <td className="p-4 font-mono text-ink text-label">
                            @{u.username}
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
                          <td className="p-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-micro uppercase border border-edge ${
                                u.status === "Active"
                                  ? "bg-status-done-fill text-status-done-ink"
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
                              className="p-2 text-ink-muted hover:text-ink hover:bg-board-ground rounded-plate transition-colors"
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
              }
            />
          )}
        </div>
      </div>

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
