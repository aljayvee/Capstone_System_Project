import React, { useState } from "react";
import {
  UserCheck,
  X,
  AlertTriangle,
  Check,
  Eye,
  EyeOff,
  Loader2,
  CircleCheck,
  Circle,
  ShieldAlert,
  KeyRound,
  ShieldCheck,
  Headphones,
  Bike,
  User,
  AtSign,
  Phone,
  Mail,
  Lock,
  RotateCcw,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { UserRole } from "../../../../../types/auth";
import { UserRecord } from "../UserManagementModule";
import { useAuth } from "../../../../../context/AuthContext";
import { ASSIGNABLE_ROLES, AssignableRole, requiresRoleChangeApproval, roleLabel } from "../../../../../constants/userRoles";
import {
  PASSWORD_RULES,
  PH_MOBILE_LENGTH,
  sanitizePhoneInput,
  validateConfirmPassword,
  validateEmail,
  validateName,
  validatePassword,
  validatePhone,
  validateRole,
  validateUsername,
} from "../../../../../utils/userValidation";

type EditUserPayload = Partial<{
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
}> & { id: number; version: number };

interface EditUserModalProps {
  user: UserRecord;
  onClose: () => void;
  onSave: (user: EditUserPayload) => Promise<boolean>;
}

type FieldKey =
  | "role"
  | "firstName"
  | "middleName"
  | "lastName"
  | "username"
  | "phone"
  | "email"
  | "password"
  | "confirmPassword";

const ROLE_METADATA: Record<
  AssignableRole,
  { label: string; description: string; icon: React.ElementType; color: string; border: string; bg: string; activeBg: string }
> = {
  owner: {
    label: "Admin",
    description: "Full system & business governance",
    icon: ShieldCheck,
    color: "text-purple-700",
    border: "border-purple-200",
    bg: "bg-purple-50/70",
    activeBg: "bg-purple-600 text-white",
  },
  dispatcher: {
    label: "Dispatcher",
    description: "Order routing, fleet & chat hub",
    icon: Headphones,
    color: "text-blue-700",
    border: "border-blue-200",
    bg: "bg-blue-50/70",
    activeBg: "bg-blue-600 text-white",
  },
  rider: {
    label: "Delivery Rider",
    description: "Field order execution & mobile app",
    icon: Bike,
    color: "text-amber-700",
    border: "border-amber-200",
    bg: "bg-amber-50/70",
    activeBg: "bg-amber-600 text-white",
  },
};

export const EditUserModal: React.FC<EditUserModalProps> = ({ user, onClose, onSave }) => {
  const { user: currentUser } = useAuth();

  const [firstName, setFirstName] = useState(user.firstName);
  const [middleName, setMiddleName] = useState(user.middleName || "");
  const [lastName, setLastName] = useState(user.lastName);
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone);
  const [role, setRole] = useState<UserRole>(user.role);
  const [status, setStatus] = useState<"Active" | "Inactive">(user.status);

  // Optional password update fields
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});

  // Re-authentication step
  const [showReauth, setShowReauth] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [reauthError, setReauthError] = useState("");

  const roleChangeNeedsApproval = requiresRoleChangeApproval(user.role, role);

  const clearFieldError = (field: FieldKey) =>
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));

  const validateAll = (): Partial<Record<FieldKey, string>> => {
    const errors: Partial<Record<FieldKey, string>> = {};
    const set = (key: FieldKey, message: string | null) => {
      if (message) errors[key] = message;
    };

    set("role", validateRole(role));
    set("firstName", validateName(firstName, "First name"));
    set("middleName", validateName(middleName, "Middle name", false));
    set("lastName", validateName(lastName, "Last name"));
    set("username", validateUsername(username));
    set("phone", validatePhone(phone));
    set("email", validateEmail(email));

    if (showPasswordSection && (password || confirmPassword)) {
      set("password", validatePassword(password));
      if (!errors.password) set("confirmPassword", validateConfirmPassword(password, confirmPassword));
    }

    return errors;
  };

  const buildPayload = (): EditUserPayload => {
    const payload: EditUserPayload = { id: user.id, version: user.version };

    const trimmedFirstName = firstName.trim();
    const trimmedMiddleName = middleName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();

    if (trimmedFirstName !== user.firstName) payload.firstName = trimmedFirstName;
    if (trimmedMiddleName !== (user.middleName || "")) payload.middleName = trimmedMiddleName;
    if (trimmedLastName !== user.lastName) payload.lastName = trimmedLastName;
    if (trimmedUsername !== user.username) payload.username = trimmedUsername;
    if (trimmedEmail !== user.email) payload.email = trimmedEmail;
    if (trimmedPhone !== user.phone) payload.phone = trimmedPhone;
    if (role !== user.role) payload.role = role;
    if (status !== user.status) payload.status = status;
    if (showPasswordSection && password) payload.password = password;

    return payload;
  };

  const submit = async (extra?: { adminUsername: string; adminPassword: string }) => {
    setError("");
    setIsSubmitting(true);

    try {
      const payload = buildPayload();
      if (extra) {
        payload.adminUsername = extra.adminUsername;
        payload.adminPassword = extra.adminPassword;
      }

      const success = await onSave(payload);
      if (success) {
        onClose();
      }
    } catch (err: any) {
      const message = err.message || "Failed to update user. Please try again.";
      if (showReauth) {
        setReauthError(message);
      } else {
        setError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validateAll();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError("Please review and complete all required fields marked in red.");
      return;
    }

    if (roleChangeNeedsApproval) {
      setError("");
      setAdminPassword("");
      setReauthError("");
      setShowReauth(true);
      return;
    }

    await submit();
  };

  const handleReauthConfirm = async () => {
    if (!adminPassword.trim()) {
      setReauthError("Enter your admin password to confirm this role change.");
      return;
    }
    await submit({
      adminUsername: currentUser?.username || "",
      adminPassword,
    });
  };

  const inputBaseClass = (hasError: boolean) =>
    `w-full bg-slate-50 border rounded-xl py-2.5 px-3.5 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none transition duration-150 focus:bg-white ${
      hasError
        ? "border-red-300 focus:ring-2 focus:ring-red-400/30 focus:border-red-500 bg-red-50/30"
        : "border-slate-200 focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F]"
    }`;

  // ── Re-authentication confirmation step ──────────────────────────────────
  if (showReauth) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
        <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl max-w-md w-full overflow-hidden shadow-2xl space-y-5 p-6 sm:p-7 my-auto">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold shadow-md shadow-red-900/10 shrink-0">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Security Verification</h3>
              <p className="text-[11px] font-medium text-slate-500">Confirm privileged role change</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
              <AlertTriangle size={15} className="shrink-0 text-amber-600" />
              <span>Operational Role Re-assignment</span>
            </p>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              <span className="font-extrabold text-slate-900">{user.name}</span> will be switched from{" "}
              <span className="font-extrabold text-purple-800 bg-purple-100/60 px-1.5 py-0.5 rounded">{roleLabel(user.role)}</span> to{" "}
              <span className="font-extrabold text-blue-800 bg-blue-100/60 px-1.5 py-0.5 rounded">{roleLabel(role)}</span>. This
              immediately updates permissions and active dispatch duties.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
              Admin Password {currentUser?.username ? `(@${currentUser.username})` : ""} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showAdminPassword ? "text" : "password"}
                autoFocus
                autoComplete="current-password"
                value={adminPassword}
                onChange={(e) => {
                  setAdminPassword(e.target.value);
                  setReauthError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleReauthConfirm();
                  }
                }}
                placeholder="Enter your administrator password"
                className={`${inputBaseClass(!!reauthError)} pl-9 pr-9 font-mono`}
              />
              <button
                type="button"
                onClick={() => setShowAdminPassword(!showAdminPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                {showAdminPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {reauthError && <p className="text-[11px] font-bold text-red-600 mt-1">{reauthError}</p>}
          </div>

          <div className="flex gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setShowReauth(false);
                setAdminPassword("");
                setReauthError("");
              }}
              disabled={isSubmitting}
              className="flex-1 bg-white hover:bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl border border-slate-200 text-xs transition disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleReauthConfirm}
              disabled={isSubmitting}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl shadow-sm text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <ShieldAlert size={14} />}
              <span>Verify & Apply</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Edit Form ───────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl max-w-xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center font-bold shadow-md shadow-amber-900/10 shrink-0">
              <UserCheck size={18} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 leading-tight">Edit Personnel Account</h3>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                Update account credentials, profile details & operational role
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto px-5 sm:px-6 py-5 space-y-6 flex-1">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form id="edit-user-form" onSubmit={handleSubmit} noValidate className="space-y-6">
            {/* 1. ROLE & STATUS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                  1. Operational Role & Status
                </label>
                {/* Status Segmented Capsule */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setStatus("Active")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition ${
                      status === "Active"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <CheckCircle2 size={12} />
                    <span>Active</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus("Inactive")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition ${
                      status === "Inactive"
                        ? "bg-slate-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <XCircle size={12} />
                    <span>Inactive</span>
                  </button>
                </div>
              </div>

              {/* Role Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {ASSIGNABLE_ROLES.map((option) => {
                  const meta = ROLE_METADATA[option.value];
                  const Icon = meta.icon;
                  const isSelected = role === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setRole(option.value);
                        clearFieldError("role");
                      }}
                      className={`p-3 rounded-xl border text-left transition-all duration-150 relative flex flex-col justify-between ${
                        isSelected
                          ? `border-[#1E3A5F] ring-2 ring-[#1E3A5F]/20 bg-slate-50 shadow-xs`
                          : `border-slate-200 hover:border-slate-300 hover:bg-slate-50/50`
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            isSelected ? meta.activeBg : `${meta.bg} ${meta.color}`
                          }`}
                        >
                          <Icon size={14} />
                        </div>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center text-[10px]">
                            <Check size={10} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800">{meta.label}</p>
                        <p className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">
                          {meta.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {roleChangeNeedsApproval && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold leading-relaxed">
                  <ShieldAlert size={15} className="shrink-0 mt-0.5 text-amber-600" />
                  <span>
                    Changing role from <strong className="text-slate-900">{roleLabel(user.role)}</strong> to{" "}
                    <strong className="text-slate-900">{roleLabel(role)}</strong> requires admin password authorization upon saving.
                  </span>
                </div>
              )}
            </div>

            {/* 2. PERSONAL INFORMATION */}
            <div className="space-y-3">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 block">
                2. Personal Information
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        clearFieldError("firstName");
                      }}
                      placeholder="Juan"
                      className={`${inputBaseClass(!!fieldErrors.firstName)} pl-9`}
                    />
                  </div>
                  {fieldErrors.firstName && (
                    <p className="mt-1 text-[10.5px] font-semibold text-red-600">{fieldErrors.firstName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        clearFieldError("lastName");
                      }}
                      placeholder="Dela Cruz"
                      className={`${inputBaseClass(!!fieldErrors.lastName)} pl-9`}
                    />
                  </div>
                  {fieldErrors.lastName && (
                    <p className="mt-1 text-[10.5px] font-semibold text-red-600">{fieldErrors.lastName}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Middle Name <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={middleName}
                  onChange={(e) => {
                    setMiddleName(e.target.value);
                    clearFieldError("middleName");
                  }}
                  placeholder="e.g. Santos"
                  className={inputBaseClass(!!fieldErrors.middleName)}
                />
                {fieldErrors.middleName && (
                  <p className="mt-1 text-[10.5px] font-semibold text-red-600">{fieldErrors.middleName}</p>
                )}
              </div>
            </div>

            {/* 3. CONTACT & ACCOUNT CREDENTIALS */}
            <div className="space-y-3">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 block">
                3. Contact & Login Credentials
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <AtSign size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value.replace(/\s/g, ""));
                        clearFieldError("username");
                      }}
                      placeholder="jdelacruz"
                      className={`${inputBaseClass(!!fieldErrors.username)} pl-9 font-mono`}
                    />
                  </div>
                  {fieldErrors.username && (
                    <p className="mt-1 text-[10.5px] font-semibold text-red-600">{fieldErrors.username}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="tel"
                      maxLength={PH_MOBILE_LENGTH}
                      value={phone}
                      onChange={(e) => {
                        setPhone(sanitizePhoneInput(e.target.value));
                        clearFieldError("phone");
                      }}
                      placeholder="09XXXXXXXXX"
                      className={`${inputBaseClass(!!fieldErrors.phone)} pl-9 font-mono`}
                    />
                  </div>
                  {fieldErrors.phone ? (
                    <p className="mt-1 text-[10.5px] font-semibold text-red-600">{fieldErrors.phone}</p>
                  ) : (
                    <p className="mt-1 text-[10px] text-slate-400 font-medium">
                      PH mobile: 11 digits starting with 09
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value.replace(/\s/g, ""));
                      clearFieldError("email");
                    }}
                    placeholder="juandelacruz@speedyerrand.com"
                    className={`${inputBaseClass(!!fieldErrors.email)} pl-9`}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="mt-1 text-[10.5px] font-semibold text-red-600">{fieldErrors.email}</p>
                )}
              </div>
            </div>

            {/* 4. PASSWORD RESET ACCORDION */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <RotateCcw size={13} />
                  <span>Password Reset</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordSection(!showPasswordSection);
                    if (showPasswordSection) {
                      setPassword("");
                      setConfirmPassword("");
                    }
                  }}
                  className="text-xs font-extrabold text-[#1E3A5F] hover:underline"
                >
                  {showPasswordSection ? "Cancel Password Reset" : "+ Reset User Password"}
                </button>
              </div>

              {showPasswordSection && (
                <div className="space-y-3 bg-slate-50/70 border border-slate-200 rounded-2xl p-4 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">New Password</label>
                      <div className="relative">
                        <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            clearFieldError("password");
                          }}
                          placeholder="Min. 8 characters"
                          className={`${inputBaseClass(!!fieldErrors.password)} pl-9 pr-9 font-mono`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                        >
                          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                      {fieldErrors.password && (
                        <p className="mt-1 text-[10.5px] font-semibold text-red-600">{fieldErrors.password}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Confirm New Password</label>
                      <div className="relative">
                        <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            clearFieldError("confirmPassword");
                          }}
                          placeholder="Repeat new password"
                          className={`${inputBaseClass(!!fieldErrors.confirmPassword)} pl-9 font-mono`}
                        />
                      </div>
                      {fieldErrors.confirmPassword && (
                        <p className="mt-1 text-[10.5px] font-semibold text-red-600">{fieldErrors.confirmPassword}</p>
                      )}
                    </div>
                  </div>

                  {/* Password Rules Live Feedback */}
                  {(password || confirmPassword) && (
                    <div className="bg-white border border-slate-200 rounded-xl p-3">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                        Password Requirements
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                        {PASSWORD_RULES.map((rule) => {
                          const passed = rule.test(password);
                          return (
                            <div
                              key={rule.label}
                              className={`flex items-center gap-1.5 text-[11px] font-semibold transition-colors ${
                                passed ? "text-emerald-600" : "text-slate-400"
                              }`}
                            >
                              {passed ? (
                                <CircleCheck size={13} className="shrink-0 text-emerald-500" />
                              ) : (
                                <Circle size={13} className="shrink-0 text-slate-300" />
                              )}
                              <span>{rule.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 sm:px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-user-form"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Check size={15} />
                <span>{roleChangeNeedsApproval ? "Authorize Role Change" : "Save Changes"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
