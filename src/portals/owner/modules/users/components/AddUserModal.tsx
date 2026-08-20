import React, { useState } from "react";
import { UserPlus, X, AlertTriangle, Check, Eye, EyeOff, ShieldCheck, Mail, Phone, Lock, User, Loader2 } from "lucide-react";
import { UserRole } from "../../../../../types/auth";

interface AddUserModalProps {
  onClose: () => void;
  onSave: (user: {
    firstName: string;
    middleName?: string;
    lastName: string;
    username: string;
    email: string;
    phone: string;
    role: UserRole;
    password?: string;
  }) => Promise<boolean> | void;
}

export const AddUserModal: React.FC<AddUserModalProps> = ({ onClose, onSave }) => {
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("rider");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !username.trim() || !phone.trim()) {
      setError("Please fill in First Name, Last Name, Username, and Phone.");
      return;
    }

    if (!password) {
      setError("Password is required for creating a new user.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const res = await onSave({
        firstName: firstName.trim(),
        middleName: middleName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role,
        password,
      });
      if (res !== false) {
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "Failed to create user. Please check the backend server.");
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
            <div className="w-10 h-10 rounded-xl bg-[#1E3A5F] text-white flex items-center justify-center font-bold shadow-xs">
              <UserPlus size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800">Add System User</h3>
              <p className="text-[11px] text-slate-500">Register operational personnel (Owner, Dispatcher, Rider)</p>
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
          {/* Role Selection */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Assigned Role *</label>
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
            <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Middle Name (Optional)</label>
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

          {/* Password Row */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Password *</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 chars"
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
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Confirm Password *</label>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 text-xs font-mono outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:bg-white transition"
              />
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
              className="flex-1 bg-[#1E3A5F] hover:bg-[#162D4A] text-white font-bold py-2.5 rounded-xl shadow-sm text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              <span>Save User Account</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
