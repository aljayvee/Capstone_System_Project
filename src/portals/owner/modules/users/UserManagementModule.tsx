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
} from "lucide-react";
import { toast } from "sonner";
import { AddUserModal } from "./components/AddUserModal";
import { EditUserModal } from "./components/EditUserModal";
import { UserRole } from "../../../../types/auth";
import { apiService } from "../../../../services/apiService";
import { NotificationBell } from "../../../../components/NotificationBell";
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
          }))
        );
      } else {
        setLoadError("Could not load users from the server.");
      }
    } catch (err: any) {
      setLoadError("Failed to fetch users. Please check backend connection.");
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
    }> & { id: number; version: number }
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
        toast.error("Someone else just updated this user — refreshing the list.");
        await loadBackendUsers();
      }
      throw err;
    }
  };

  // Metrics computation for at-a-glance cognitive summary
  const totalUsers = users.length;
  const totalAdmins = useMemo(() => users.filter((u) => u.role === "owner").length, [users]);
  const totalDispatchers = useMemo(() => users.filter((u) => u.role === "dispatcher").length, [users]);
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
          bg: "bg-purple-50",
          text: "text-purple-700",
          border: "border-purple-200",
          icon: ShieldCheck,
        };
      case "dispatcher":
        return {
          label: ROLE_BADGE_LABELS.dispatcher,
          bg: "bg-blue-50",
          text: "text-blue-700",
          border: "border-blue-200",
          icon: Headphones,
        };
      case "rider":
        return {
          label: ROLE_BADGE_LABELS.rider,
          bg: "bg-amber-50",
          text: "text-amber-700",
          border: "border-amber-200",
          icon: Bike,
        };
      default:
        return {
          label: role,
          bg: "bg-slate-50",
          text: "text-slate-700",
          border: "border-slate-200",
          icon: Users,
        };
    }
  };

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
        aria-sort={isActive ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
        title={`Sort by ${label}`}
        className={`group inline-flex items-center gap-1 rounded-lg px-2 py-1 -ml-2 uppercase tracking-wider font-extrabold text-[10px] transition ${
          isActive ? "text-[#1E3A5F] bg-slate-200/70" : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
        } ${className}`}
      >
        <span>{label}</span>
        <Icon size={12} className={isActive ? "opacity-100" : "opacity-40 group-hover:opacity-80"} />
      </button>
    );
  };

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
      {/* 1. TOP HEADER & PRIMARY ACTION (STATIC NON-SCROLLING)         */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
              <Users size={18} />
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">User Management</h2>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-2.5 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <NotificationBell />
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 bg-[#1E3A5F] hover:bg-[#162D4A] text-white font-bold text-xs px-3.5 sm:px-4 py-2 rounded-xl shadow-xs transition active:scale-98"
          >
            <Plus size={15} />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. SEARCH, FILTERS & VIEW TOGGLE (STATIC NON-SCROLLING)       */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
          {/* Search Bar with Clear Button */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, username, email, or phone number..."
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F] focus:bg-white transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Right Controls: Role, Status, Sort & View Switcher */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto shrink-0">
            {/* Role Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
              <Users size={14} className="text-slate-400 shrink-0" />
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="ALL">All Roles ({totalUsers})</option>
                <option value="dispatcher">Dispatchers ({totalDispatchers})</option>
                <option value="rider">Riders ({totalRiders})</option>
                <option value="owner">Admins ({totalAdmins})</option>
              </select>
            </div>

            {/* Status Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
              <CheckCircle2 size={14} className="text-slate-400 shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="ALL">All Status</option>
                <option value="Active">Active ({activeUsers})</option>
                <option value="Inactive">Inactive ({totalUsers - activeUsers})</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
              <ArrowUpDown size={14} className="text-slate-400 shrink-0" />
              <select
                value={`${sortKey}-${sortDirection}`}
                onChange={(e) => {
                  const [key, dir] = e.target.value.split("-") as [SortKey, SortDirection];
                  setSortKey(key);
                  setSortDirection(dir);
                }}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
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
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/60">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === "table" || viewMode === "auto"
                    ? "bg-white text-[#1E3A5F] shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Table View"
              >
                <TableIcon size={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === "cards"
                    ? "bg-white text-[#1E3A5F] shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Cards Grid View"
              >
                <LayoutGrid size={14} />
              </button>
            </div>

            {/* Accounts Count */}
            <span className="text-[10.5px] font-semibold text-slate-400 ml-1 hidden xl:inline">
              {sortedUsers.length} of {totalUsers} account{totalUsers === 1 ? "" : "s"} shown
            </span>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="shrink-0 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold px-4 py-2.5 rounded-2xl flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. DIRECTORY CONTENT - ONLY THIS CONTAINER SCROLLS!            */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 shadow-xs flex flex-col items-center justify-center">
          <Loader2 size={28} className="animate-spin text-[#1E3A5F]" />
          <span className="text-xs font-bold text-slate-600 mt-2">Loading user accounts...</span>
        </div>
      ) : sortedUsers.length === 0 ? (
        <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 shadow-xs space-y-3 flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Users size={28} />
          </div>
          <div>
            <p className="font-extrabold text-slate-800 text-base">No user accounts found</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {search || selectedRole !== "ALL" || statusFilter !== "ALL"
                ? "No matching users found for your current filter query."
                : "No user accounts exist yet in the database."}
            </p>
          </div>
          {(search || selectedRole !== "ALL" || statusFilter !== "ALL") && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
            >
              <span>Reset All Filters</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* 5A. CARD GRID VIEW - SCROLLABLE */}
          <div
            className={`flex-1 min-h-0 overflow-y-auto pr-1 pb-4 scrollbar-thin ${
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
                    className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col justify-between gap-3 hover:shadow-xs transition"
                  >
                    {/* Card Header: Avatar, Name, Role & Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <StaffAvatar userId={u.id} name={u.name} size={40} />
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-900 text-sm truncate">{u.name}</p>
                          <p className="text-[11px] font-mono text-slate-500 truncate">@{u.username}</p>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border shrink-0 ${
                          u.status === "Active"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        {u.status === "Active" ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                        <span>{u.status}</span>
                      </span>
                    </div>

                    {/* Card Meta & Contacts */}
                    <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-[10.5px] font-semibold text-slate-400">Role</span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${roleBadge.bg} ${roleBadge.text} ${roleBadge.border}`}
                        >
                          <RoleIcon size={12} />
                          <span>{roleBadge.label}</span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/50">
                        <span className="text-[10.5px] font-semibold text-slate-400">Phone</span>
                        <button
                          type="button"
                          onClick={() => u.phone && handleCopy(u.phone, `phone-${u.id}`)}
                          className="font-mono text-xs font-bold text-slate-700 hover:text-blue-700 flex items-center gap-1"
                        >
                          <span>{u.phone || "—"}</span>
                          {u.phone && (
                            <span className="text-slate-400">
                              {copiedId === `phone-${u.id}` ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                            </span>
                          )}
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/50">
                        <span className="text-[10.5px] font-semibold text-slate-400">Email</span>
                        <span className="text-xs font-medium text-slate-700 truncate max-w-[170px]" title={u.email}>
                          {u.email || "—"}
                        </span>
                      </div>
                    </div>

                    {/* Card Footer: Actions */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                      <button
                        onClick={() => setEditingUser(u)}
                        className="w-full py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200 hover:border-amber-200 transition flex items-center justify-center gap-1.5"
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
            className={`flex-1 min-h-0 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs flex flex-col ${
              viewMode === "table" ? "block" : viewMode === "cards" ? "hidden" : "hidden lg:flex"
            }`}
          >
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto relative scrollbar-thin">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-200 sticky top-0 z-10 select-none shadow-xs backdrop-blur-md">
                  <tr>
                    <th className="p-4">
                      <SortButton label="User Profile" sortBy="name" />
                    </th>
                    <th className="p-4">
                      <SortButton label="Assigned Role" sortBy="role" />
                    </th>
                    <th className="p-4">
                      <SortButton label="Username" sortBy="username" />
                    </th>
                    <th className="p-4">
                      <SortButton label="Contact Phone" sortBy="phone" />
                    </th>
                    <th className="p-4">
                      <SortButton label="Account Status" sortBy="status" />
                    </th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedUsers.map((u) => {
                    const roleBadge = getRoleBadge(u.role);
                    const RoleIcon = roleBadge.icon;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition group">
                        {/* Name & Email Avatar */}
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <StaffAvatar userId={u.id} name={u.name} size={40} />
                            <div className="min-w-0">
                              <p className="font-extrabold text-slate-900 text-sm truncate">{u.name}</p>
                              <p className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                                <Mail size={12} className="text-slate-400" />
                                <span>{u.email || "No email provided"}</span>
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Role Badge */}
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${roleBadge.bg} ${roleBadge.text} ${roleBadge.border}`}
                          >
                            <RoleIcon size={13} />
                            <span>{roleBadge.label}</span>
                          </span>
                        </td>

                        {/* Username */}
                        <td className="p-4 font-mono font-bold text-slate-700 text-xs">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">@{u.username}</span>
                        </td>

                        {/* Phone */}
                        <td className="p-4 text-slate-600 font-mono text-xs">
                          <button
                            type="button"
                            onClick={() => u.phone && handleCopy(u.phone, `table-phone-${u.id}`)}
                            className="flex items-center gap-1.5 hover:text-blue-700 transition"
                            title="Click to copy phone"
                          >
                            <Phone size={12} className="text-slate-400" />
                            <span>{u.phone || "—"}</span>
                            {u.phone && (
                              <span className="text-slate-400">
                                {copiedId === `table-phone-${u.id}` ? (
                                  <Check size={11} className="text-emerald-600" />
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
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                              u.status === "Active"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-500 border-slate-200"
                            }`}
                          >
                            {u.status === "Active" ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                            <span>{u.status}</span>
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setEditingUser(u)}
                            className="p-2 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-xl transition border border-transparent hover:border-amber-200"
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
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddUser}
        />
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
