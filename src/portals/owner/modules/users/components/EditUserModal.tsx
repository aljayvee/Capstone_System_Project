import React, { useState } from "react";
import {
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
import {
  ASSIGNABLE_ROLES,
  AssignableRole,
  requiresRoleChangeApproval,
  roleLabel,
} from "../../../../../constants/userRoles";
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
  {
    label: string;
    description: string;
    icon: React.ElementType;
    color: string;
    bg: string;
    activeBg: string;
  }
> = {
  owner: {
    label: "Admin",
    description: "Full system & business governance",
    icon: ShieldCheck,
    color: "text-ink",
    bg: "bg-board-ground",
    activeBg: "bg-board-field text-white",
  },
  dispatcher: {
    label: "Dispatcher",
    description: "Order routing, fleet & chat hub",
    icon: Headphones,
    color: "text-ink",
    bg: "bg-board-ground",
    activeBg: "bg-board-field text-white",
  },
  rider: {
    label: "Delivery Rider",
    description: "Field order execution & mobile app",
    icon: Bike,
    color: "text-ink",
    bg: "bg-board-ground",
    activeBg: "bg-board-field text-white",
  },
};

export const EditUserModal: React.FC<EditUserModalProps> = ({ user, onClose, onSave }) => {
  const { user: currentUser } = useAuth();
  const isSelf = Boolean(
    currentUser && (currentUser.id === user.id || currentUser.username === user.username),
  );

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
      if (!errors.password)
        set("confirmPassword", validateConfirmPassword(password, confirmPassword));
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
    if (!isSelf && role !== user.role) payload.role = role;
    if (!isSelf && status !== user.status) payload.status = status;
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
    `w-full bg-board-ground border border-edge rounded-plate py-2.5 px-3.5 text-body text-ink placeholder-ink-muted outline-none transition duration-150 focus:bg-board-plate ${
      hasError
        ? "border-status-act-ink/50 focus:ring-2 focus:ring-status-act-ink/25 focus:border-status-act-ink bg-status-act-fill"
        : "border-edge focus:ring-2 focus:ring-board-field/20 focus:border-board-field"
    }`;

  // ── Re-authentication confirmation step ──────────────────────────────────
  if (showReauth) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 overflow-y-auto animate-fade-in">
        <div className="bg-board-plate border border-edge rounded-plate sm:rounded-plate max-w-md w-full overflow-hidden space-y-5 p-6 sm:p-7 my-auto">
          <div className="flex items-center gap-3 border-b border-hairline pb-4">
            <div className="w-10 h-10 rounded-plate bg-signal text-white flex items-center justify-center font-bold shrink-0">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="text-panel text-ink">Security Verification</h3>
              <p className="text-body text-ink-muted">Confirm privileged role change</p>
            </div>
          </div>

          <div className="bg-status-waiting-fill border border-status-waiting-ink/20 rounded-plate p-4 space-y-2">
            <p className="text-label text-status-waiting-ink flex items-center gap-1.5">
              <AlertTriangle size={15} className="shrink-0 text-status-waiting-ink" />
              <span>Operational Role Re-assignment</span>
            </p>
            <p className="text-label text-status-waiting-ink leading-relaxed">
              <span className="font-bold text-ink">{user.name}</span> will be switched from{" "}
              <span className="font-bold text-ink-muted bg-board-ground px-1.5 py-0.5 rounded">
                {roleLabel(user.role)}
              </span>{" "}
              to{" "}
              <span className="font-bold text-ink bg-board-ground px-1.5 py-0.5 rounded">
                {roleLabel(role)}
              </span>
              . This immediately updates permissions and active dispatch duties.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-micro uppercase text-ink">
              Admin Password {currentUser?.username ? `(@${currentUser.username})` : ""}{" "}
              <span className="text-signal">*</span>
            </label>
            <div className="relative">
              <KeyRound
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
              />
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
              >
                {showAdminPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {reauthError && <p className="text-label text-status-act-ink mt-1">{reauthError}</p>}
          </div>

          <div className="flex gap-2.5 pt-3 border-t border-hairline">
            <button
              type="button"
              onClick={() => {
                setShowReauth(false);
                setAdminPassword("");
                setReauthError("");
              }}
              disabled={isSubmitting}
              className="flex-1 bg-board-plate hover:bg-board-ground text-ink py-2.5 rounded-plate border border-edge text-label transition disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleReauthConfirm}
              disabled={isSubmitting}
              className="flex-1 bg-signal hover:bg-signal text-white py-2.5 rounded-plate text-label flex items-center justify-center gap-1.5 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ShieldAlert size={14} />
              )}
              <span>Verify & Apply</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Edit Form ───────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 overflow-y-auto animate-fade-in">
      <div className="bg-board-plate border border-edge rounded-plate sm:rounded-plate max-w-xl w-full max-h-[94vh] flex flex-col overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-hairline bg-board-ground shrink-0">
          {/* Same removal as the add modal: a gradient chip with a coloured
              shadow, replaced by the title doing its own work. */}
          <div className="min-w-0">
            <h3 className="truncate text-panel text-ink">Edit Personnel Account</h3>
            <p className="mt-0.5 text-label text-ink-muted">
              Update account credentials, profile details & operational role
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-trim flex items-center justify-center text-ink-muted hover:text-ink hover:bg-board-ground transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto px-5 sm:px-6 py-5 space-y-6 flex-1">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-plate bg-status-act-fill border border-status-act-ink/20 text-status-act-ink text-label">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form id="edit-user-form" onSubmit={handleSubmit} noValidate className="space-y-6">
            {/* 1. ROLE & STATUS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-micro uppercase text-ink">
                  1. Operational Role & Status
                </label>
                {/* Status Segmented Capsule */}
                {isSelf ? (
                  <div
                    className="flex items-center gap-1.5 px-3 py-1 rounded-plate bg-status-done-fill border border-status-done-ink/20 text-status-done-ink text-label select-none"
                    title="You cannot deactivate your own account while logged in"
                  >
                    <CheckCircle2 size={13} className="text-status-done-ink shrink-0" />
                    <span>Active (Current Admin)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 bg-board-ground p-1 rounded-plate">
                    <button
                      type="button"
                      onClick={() => setStatus("Active")}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-trim text-label transition ${
                        status === "Active"
                          ? "bg-status-done-ink text-white"
                          : "text-ink-muted hover:text-ink"
                      }`}
                    >
                      <CheckCircle2 size={12} />
                      <span>Active</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus("Inactive")}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-trim text-label transition ${
                        status === "Inactive"
                          ? "bg-board-field text-white"
                          : "text-ink-muted hover:text-ink"
                      }`}
                    >
                      <XCircle size={12} />
                      <span>Inactive</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Role Display / Selection */}
              {isSelf ? (
                <div className="p-3.5 rounded-plate border border-edge bg-board-ground flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-trim bg-board-field text-white flex items-center justify-center font-bold shrink-0">
                      <ShieldCheck size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-label text-ink">{roleLabel(user.role)}</p>
                        <span className="px-2 py-0.5 rounded-full text-label bg-board-ground text-ink-muted border border-edge ">
                          Current Admin
                        </span>
                      </div>
                      <p className="text-body text-ink-muted mt-0.5">
                        Your administrative role is locked while logged into this account.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-label text-ink-muted bg-board-plate px-2.5 py-1 rounded-trim border border-edge shrink-0">
                    <Lock size={12} className="text-ink-muted" />
                    <span>Locked</span>
                  </div>
                </div>
              ) : (
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
                        className={`p-3 rounded-plate border border-edge text-left transition-all duration-150 relative flex flex-col justify-between ${
                          isSelected
                            ? `border-board-field ring-2 ring-board-field/20 bg-board-ground`
                            : `border-edge hover:border-edge hover:bg-board-ground`
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div
                            className={`w-7 h-7 rounded-trim flex items-center justify-center ${
                              isSelected ? meta.activeBg : `${meta.bg} ${meta.color}`
                            }`}
                          >
                            <Icon size={14} />
                          </div>
                          {isSelected && (
                            <span className="w-4 h-4 rounded-full bg-board-field text-white flex items-center justify-center text-label">
                              <Check size={10} strokeWidth={3} />
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-label text-ink">{meta.label}</p>
                          <p className="text-body text-ink-muted leading-tight mt-0.5">
                            {meta.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {roleChangeNeedsApproval && !isSelf && (
                <div className="flex items-start gap-2 p-3 rounded-plate bg-status-waiting-fill border border-status-waiting-ink/20 text-status-waiting-ink text-label leading-relaxed">
                  <ShieldAlert size={15} className="shrink-0 mt-0.5 text-status-waiting-ink" />
                  <span>
                    Changing role from <strong className="text-ink">{roleLabel(user.role)}</strong>{" "}
                    to <strong className="text-ink">{roleLabel(role)}</strong> requires admin
                    password authorization upon saving.
                  </span>
                </div>
              )}
            </div>

            {/* 2. PERSONAL INFORMATION */}
            <div className="space-y-3">
              <label className="text-micro uppercase text-ink block">2. Personal Information</label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-label text-ink-muted mb-1">
                    First Name <span className="text-signal">*</span>
                  </label>
                  <div className="relative">
                    <User
                      size={14}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
                    />
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
                    <p className="mt-1 text-label text-status-act-ink">{fieldErrors.firstName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-label text-ink-muted mb-1">
                    Last Name <span className="text-signal">*</span>
                  </label>
                  <div className="relative">
                    <User
                      size={14}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
                    />
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
                    <p className="mt-1 text-label text-status-act-ink">{fieldErrors.lastName}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-label text-ink-muted mb-1">
                  Middle Name <span className="text-ink-muted font-normal">(Optional)</span>
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
                  <p className="mt-1 text-label text-status-act-ink">{fieldErrors.middleName}</p>
                )}
              </div>
            </div>

            {/* 3. CONTACT & ACCOUNT CREDENTIALS */}
            <div className="space-y-3">
              <label className="text-micro uppercase text-ink block">
                3. Contact & Login Credentials
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-label text-ink-muted mb-1">
                    Username <span className="text-signal">*</span>
                  </label>
                  <div className="relative">
                    <AtSign
                      size={14}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
                    />
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
                    <p className="mt-1 text-label text-status-act-ink">{fieldErrors.username}</p>
                  )}
                </div>

                <div>
                  <label className="block text-label text-ink-muted mb-1">
                    Phone Number <span className="text-signal">*</span>
                  </label>
                  <div className="relative">
                    <Phone
                      size={14}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
                    />
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
                    <p className="mt-1 text-label text-status-act-ink">{fieldErrors.phone}</p>
                  ) : (
                    <p className="mt-1 text-body text-ink-muted">
                      PH mobile: 11 digits starting with 09
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-label text-ink-muted mb-1">
                  Email Address <span className="text-signal">*</span>
                </label>
                <div className="relative">
                  <Mail
                    size={14}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
                  />
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
                  <p className="mt-1 text-label text-status-act-ink">{fieldErrors.email}</p>
                )}
              </div>
            </div>

            {/* 4. PASSWORD RESET ACCORDION */}
            <div className="space-y-3 pt-3 border-t border-hairline">
              <div className="flex items-center justify-between">
                <label className="text-micro uppercase text-ink flex items-center gap-1.5">
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
                  className="text-label text-board-field hover:underline"
                >
                  {showPasswordSection ? "Cancel Password Reset" : "+ Reset User Password"}
                </button>
              </div>

              {showPasswordSection && (
                <div className="space-y-3 bg-board-ground border border-edge rounded-plate p-4 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-label text-ink-muted mb-1">New Password</label>
                      <div className="relative">
                        <Lock
                          size={14}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
                        />
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
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                        >
                          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                      {fieldErrors.password && (
                        <p className="mt-1 text-label text-status-act-ink">
                          {fieldErrors.password}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-label text-ink-muted mb-1">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <Lock
                          size={14}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
                        />
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
                        <p className="mt-1 text-label text-status-act-ink">
                          {fieldErrors.confirmPassword}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Password Rules Live Feedback */}
                  {(password || confirmPassword) && (
                    <div className="bg-board-plate border border-edge rounded-plate p-3">
                      <p className="text-micro uppercase text-ink-muted mb-2">
                        Password Requirements
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                        {PASSWORD_RULES.map((rule) => {
                          const passed = rule.test(password);
                          return (
                            <div
                              key={rule.label}
                              className={`flex items-center gap-1.5 text-label transition-colors ${
                                passed ? "text-status-done-ink" : "text-ink-muted"
                              }`}
                            >
                              {passed ? (
                                <CircleCheck size={13} className="shrink-0 text-status-done-ink" />
                              ) : (
                                <Circle size={13} className="shrink-0 text-ink-muted" />
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
        <div className="px-5 sm:px-6 py-4 bg-board-ground border-t border-hairline flex flex-col sm:flex-row items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-5 py-2.5 rounded-plate border border-edge bg-board-plate hover:bg-board-ground text-ink text-label transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-user-form"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-2.5 rounded-plate bg-status-waiting-ink hover:bg-status-waiting-ink text-white text-label flex items-center justify-center gap-2 transition disabled:opacity-50"
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
