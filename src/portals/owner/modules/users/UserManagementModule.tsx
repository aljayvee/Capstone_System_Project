import React, { useState, useEffect } from "react";
import { Search, Plus, Pencil } from "lucide-react";
import { AddUserModal } from "./components/AddUserModal";
import { EditUserModal } from "./components/EditUserModal";
import { UserRole } from "../../../../types/auth";
import { apiService } from "../../../../services/apiService";

export interface UserRecord {
  id: number;
  name: string;
  username: string;
  email: string;
  phone: string;
  role: UserRole;
  status: "Active" | "Inactive";
}

export const UserManagementModule: React.FC = () => {
  const [users, setUsers] = useState<UserRecord[]>([
    { id: 1, name: "Aljayvee Versola", username: "owner", email: "aj.versola@company.ph", phone: "09171234567", role: "owner", status: "Active" },
    { id: 2, name: "Mark Dennis Batcharo", username: "dispatcher", email: "md.batcharo@company.ph", phone: "09281234567", role: "dispatcher", status: "Active" },
    { id: 3, name: "Al-Dhen Musali", username: "rider01", email: "ad.musali@company.ph", phone: "09391234567", role: "rider", status: "Active" },
  ]);

  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);

  const loadBackendUsers = async () => {
    const backendUsers = await apiService.getUsers();
    if (backendUsers && backendUsers.length > 0) {
      setUsers(
        backendUsers.map((u) => ({
          id: u.id,
          name: u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username,
          username: u.username,
          email: u.email,
          phone: u.phone,
          role: u.role.toLowerCase() as UserRole,
          status: u.status || "Active",
        }))
      );
    }
  };

  useEffect(() => {
    loadBackendUsers();
  }, []);

  const handleAddUser = async (newUserData: { name: string; username: string; email: string; phone: string; role: UserRole; password?: string }) => {
    try {
      const created = await apiService.createUser(newUserData);
      if (created) {
        await loadBackendUsers();
        return true;
      }
      return false;
    } catch (err: any) {
      throw err;
    }
  };

  const handleEditUser = async (updatedData: {
    id: number;
    name: string;
    username: string;
    email: string;
    phone: string;
    role: UserRole;
    status: "Active" | "Inactive";
    password?: string;
  }) => {
    try {
      const updated = await apiService.updateUser(updatedData.id, updatedData);
      if (updated) {
        await loadBackendUsers();
        return true;
      }
      return false;
    } catch (err: any) {
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
      await apiService.updateUser(id, { status: newStatus });
    } catch (err) {
      console.warn("Failed to toggle user status on API:", err);
      // Revert if API failed
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, status: targetUser.status } : u))
      );
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="relative w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, username, role..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 text-sm outline-none focus:border-[#1E3A5F]"
          />
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-[#1E3A5F] hover:bg-[#162D4A] text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-sm transition"
        >
          <Plus size={16} /> Add New User
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
            <tr>
              <th className="p-4">User</th>
              <th className="p-4">Role</th>
              <th className="p-4">Username</th>
              <th className="p-4">Phone</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/80 transition">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#1E3A5F] text-white font-bold flex items-center justify-center text-xs">
                      {u.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{u.name}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                    {u.role}
                  </span>
                </td>
                <td className="p-4 font-mono text-slate-700">{u.username}</td>
                <td className="p-4 text-slate-600">{u.phone}</td>
                <td className="p-4">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      u.status === "Active"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-500 border border-slate-200"
                    }`}
                  >
                    {u.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setEditingUser(u)}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 transition flex items-center gap-1.5"
                    >
                      <Pencil size={14} /> Edit
                    </button>
                    <button
                      onClick={() => toggleUserStatus(u.id)}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition"
                    >
                      {u.status === "Active" ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && <AddUserModal onClose={() => setShowAddModal(false)} onSave={handleAddUser} />}
      {editingUser && <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} onSave={handleEditUser} />}
    </div>
  );
};

