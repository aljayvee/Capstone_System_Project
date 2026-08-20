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
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  MoreVertical,
  Mail,
  Phone,
  UserCheck,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AddUserModal } from "./components/AddUserModal";
import { EditUserModal } from "./components/EditUserModal";
import { UserRole } from "../../../../types/auth";
import { apiService } from "../../../../services/apiService";
import { ServerStatusBadge } from "../../../../components/ServerStatusBadge";
import { NotificationBell } from "../../../../components/NotificationBell";

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

export const UserManagementModule: React.FC = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<"ALL" | UserRole>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "Active" | "Inactive">("ALL");

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);

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
        toast.success("New user account created successfully!");
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

  const toggleUserStatus = async (id: number) => {
    const targetUser = users.find((u) => u.id === id);
    if (!targetUser) return;
    const newStatus = targetUser.status === "Active" ? "Inactive" : "Active";

    // Optimistic UI update
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status: newStatus } : u))
    );

    try {
      await apiService.updateUser(id, { status: newStatus, version: targetUser.version });
      await loadBackendUsers();
      toast.success(`User marked as ${newStatus}`);
    } catch (err: any) {
      console.warn("Failed to toggle user status on API:", err);
      // Revert if API failed
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, status: targetUser.status } : u))
      );
      if (err?.isConflict) {
        toast.error("Someone else just updated this user — refreshing the list.");
        await loadBackendUsers();
      }
    }
  };

  // Metrics computation for at-a-glance cognitive summary
  const totalUsers = users.length;
  const totalOwners = useMemo(() => users.filter((u) => u.role === "owner").length, [users]);
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
      u.phone.includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "owner":
        return {
          label: "Business Owner",
          bg: "bg-purple-50",
          text: "text-purple-700",
          border: "border-purple-200",
          icon: ShieldCheck,
        };
      case "dispatcher":
        return {
          label: "Dispatcher",
          bg: "bg-blue-50",
          text: "text-blue-700",
          border: "border-blue-200",
          icon: Headphones,
        };
      case "rider":
        return {
          label: "Delivery Rider",
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER & PRIMARY ACTION                                */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/95 backdrop-blur-md p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
              <Users size={20} />
            </span>
            <h2 className="text-xl font-extrabold text-slate-800">Users</h2>
          </div>
          <p className="text-xs text-slate-500 max-w-xl">
            Manage system accounts for Owners, Dispatchers, and Riders.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadBackendUsers}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition shadow-2xs"
            title="Refresh Users"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          </button>
          <NotificationBell />
          <ServerStatusBadge />
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-[#1E3A5F] hover:bg-[#162D4A] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition ml-1"
          >
            <Plus size={16} />
            <span>Add New User</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. PSYCHOLOGICAL SUMMARY STATS (Instant Situational Awareness) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold">
            <Users size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Users</p>
            <p className="text-xl font-black text-slate-900 mt-0.5">{totalUsers}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold">
            <Headphones size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Dispatchers</p>
            <p className="text-xl font-black text-slate-900 mt-0.5">{totalDispatchers}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold">
            <Bike size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Riders</p>
            <p className="text-xl font-black text-slate-900 mt-0.5">{totalRiders}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Accounts</p>
            <p className="text-xl font-black text-slate-900 mt-0.5">{activeUsers}</p>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. SEARCH & ROLE / STATUS FILTERS                             */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by personnel name, username, email, phone, or role..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:bg-white transition"
          />
        </div>

        {/* Role Pills & Status Filters */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Role Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setSelectedRole("ALL")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                selectedRole === "ALL"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({totalUsers})
            </button>
            <button
              onClick={() => setSelectedRole("dispatcher")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                selectedRole === "dispatcher"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Dispatchers ({totalDispatchers})
            </button>
            <button
              onClick={() => setSelectedRole("rider")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                selectedRole === "rider"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Riders ({totalRiders})
            </button>
            <button
              onClick={() => setSelectedRole("owner")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                selectedRole === "owner"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Owners ({totalOwners})
            </button>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {loadError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold px-4 py-3 rounded-2xl flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. USER DIRECTORY TABLE (High Legibility & Quick Actions)     */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4">Personnel Profile</th>
                <th className="p-4">Assigned Role</th>
                <th className="p-4">Username</th>
                <th className="p-4">Contact Phone</th>
                <th className="p-4">Account Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 size={24} className="animate-spin text-[#1E3A5F]" />
                      <span className="text-xs font-medium">Loading user accounts...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users size={32} className="text-slate-300" />
                      <p className="font-bold text-slate-700 text-sm">No user accounts found</p>
                      <p className="text-xs text-slate-400">Try adjusting your search query or filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const roleBadge = getRoleBadge(u.role);
                  const RoleIcon = roleBadge.icon;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition group">
                      {/* Name & Email Avatar */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1E3A5F] to-[#162D4A] text-white font-extrabold flex items-center justify-center text-xs shadow-xs shrink-0">
                            {u.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
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
                      <td className="p-4 font-mono font-bold text-slate-700 text-xs">{u.username}</td>

                      {/* Phone */}
                      <td className="p-4 text-slate-600 font-mono text-xs">
                        <span className="flex items-center gap-1.5">
                          <Phone size={12} className="text-slate-400" />
                          <span>{u.phone || "—"}</span>
                        </span>
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
                          {u.status === "Active" ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                          <span>{u.status}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleUserStatus(u.id)}
                            className={`p-1.5 rounded-xl border transition ${
                              u.status === "Active"
                                ? "text-emerald-600 hover:bg-emerald-50 border-emerald-200"
                                : "text-slate-400 hover:bg-slate-100 border-slate-200"
                            }`}
                            title={`Click to ${u.status === "Active" ? "deactivate" : "activate"} user`}
                          >
                            {u.status === "Active" ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                          </button>
                          <button
                            onClick={() => setEditingUser(u)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 transition flex items-center gap-1.5"
                          >
                            <Pencil size={13} />
                            <span>Edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && <AddUserModal onClose={() => setShowAddModal(false)} onSave={handleAddUser} />}
      {editingUser && <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} onSave={handleEditUser} />}
    </div>
  );
};
