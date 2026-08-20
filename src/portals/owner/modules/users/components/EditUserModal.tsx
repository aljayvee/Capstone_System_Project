import React, { useState } from "react";
import { UserCheck, X, AlertTriangle, Check, Eye, EyeOff, Lock, User, Loader2 } from "lucide-react";
import { UserRole } from "../../../../../types/auth";
import { UserRecord } from "../UserManagementModule";

interface EditUserModalProps {
  user: UserRecord;
  onClose: () => void;
  onSave: (user: Partial<{
    firstName: string;
    middleName: string;
    lastName: string;
    username: string;
    email: string;
    phone: string;
    role: UserRole;
    status: "Active" | "Inactive";
    password: string;
  }> & { id: number; version: number }) => Promise<boolean>;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({ user, onClose, onSave }) => {
  const [firstName, setFirstName] = useState(user.firstName);
  const [middleName, setMiddleName] = useState(user.middleName || "");
  const [lastName, setLastName] = useState(user.lastName);
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone);
  const [role, setRole] = useState<UserRole>(user.role);
  const [status, setStatus] = useState<"Active" | "Inactive">(user.status);

  // Optional password update fields
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !username.trim() || !phone.trim()) {
      setError("First Name, Last Name, Username, and Phone fields are required.");
      return;
    }

    if (password) {
      if (password.length < 6) {
        setError("New password must be at least 6 characters long.");
        return;
      }
      if (password !== confirmPassword) {
        setError("New passwords do not match.");
        return;
      }
    }

    setError("");
    setIsSubmitting(true);

    try {
      const payload: Partial<{
        firstName: string;
        middleName: string;
        lastName: string;
        username: string;
        email: string;
        phone: string;
        role: UserRole;
        status: "Active" | "Inactive";
        password: string;
      }> & { id: number; version: number } = { id: user.id, version: user.version };

      const trimmedFirstName = firstName.trim();
      const trimmedMiddleName = middleName.trim();
      const trimmedLastName = lastName.trim();
      const trimmedUsername = username.trim();
      const trimmedEmail = email.trim();
      const trimmedPhone = phone.trim();

      if (trimmedFirstName !== user.firstName) payload.firstName = trimmedFirstName;
      if (trimmedMiddleName !== (user.middleName || "")) payload.middleName = trimmedMiddleName;
      if (trimmedLastName !== user.lastName) payload.lastName = trimmedLastName;
      if (trimmedUsername !== user.username) payload.username = trimmedUsername;
      if (trimmedEmail !== user.email) payload.email = trimmedEmail;
      if (trimmedPhone !== user.phone) payload.phone = trimmedPhone;
      if (role !== user.role) payload.role = role;
      if (status !== user.status) payload.status = status;
      if (password) payload.password = password;

      const success = await onSave(payload);
      if (success) {
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "Failed to update user. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl space-y-5 p-6 sm:p-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
              <UserCheck size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800">Edit User Account</h3>
              <p className="text-[11px] text-slate-500">Update system user details & role permissions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role & Status Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Role *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:bg-white transition"
              >
                <option value="rider">Rider</option>
                <option value="dispatcher">Dispatcher</option>
                <option value="owner">Owner</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Account Status *</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "Active" | "Inactive")}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:bg-white transition"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Name Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Juan"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 text-xs font-medium outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Dela Cruz"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 text-xs font-medium outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Middle Name</label>
            <input
              type="text"
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
              placeholder="e.g. Santos"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 text-xs font-medium outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:bg-white transition"
            />
          </div>

          {/* Username & Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Username *</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="jdelacruz"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 text-xs font-mono font-medium outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Phone Number *</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09XXXXXXXXX"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 text-xs font-mono font-medium outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="juan@company.ph"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 text-xs font-medium outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:bg-white transition"
            />
          </div>

          {/* Password Reset Accordion */}
          <div className="border-t border-slate-100 pt-3">
            <p className="text-[11px] font-bold text-slate-700 uppercase mb-2">Reset Password (Optional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 text-xs font-mono outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:bg-white transition pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              <div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 text-xs font-mono outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:bg-white transition"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white hover:bg-slate-100 text-slate-600 font-bold py-2.5 rounded-xl border border-slate-200 text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 rounded-xl shadow-sm text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
