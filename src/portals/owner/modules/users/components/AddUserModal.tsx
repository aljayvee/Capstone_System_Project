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
  ShieldCheck,
  Headphones,
  Bike,
  User,
  AtSign,
  Phone,
  Mail,
  Lock,
} from "lucide-react";
import { UserRole } from "../../../../../types/auth";
import { ASSIGNABLE_ROLES, AssignableRole } from "../../../../../constants/userRoles";
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

export const AddUserModal: React.FC<AddUserModalProps> = ({ onClose, onSave }) => {
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});

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
    set("password", validatePassword(password));
    if (!errors.password)
      set("confirmPassword", validateConfirmPassword(password, confirmPassword));

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validateAll();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError("Please review and complete all required fields marked in red.");
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
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role: role as UserRole,
        password,
      });
      if (res !== false) {
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "Failed to create user. Please check server connectivity.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputBaseClass = (hasError: boolean) =>
    `w-full bg-board-ground border border-edge rounded-plate py-2.5 px-3.5 text-body text-ink placeholder-ink-muted outline-none transition duration-150 focus:bg-board-plate ${
      hasError
        ? "border-status-act-ink/50 focus:ring-2 focus:ring-status-act-ink/25 focus:border-status-act-ink bg-status-act-fill"
        : "border-edge focus:ring-2 focus:ring-board-field/20 focus:border-board-field"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 overflow-y-auto animate-fade-in">
      <div className="bg-board-plate border border-edge rounded-plate sm:rounded-plate max-w-xl w-full max-h-[94vh] flex flex-col overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-hairline bg-board-ground shrink-0">
          {/* The gradient icon chip is gone: it was a banned tinted chip AND
              the portal's only remaining decorative gradient, carrying a
              coloured shadow on top. The title carries the header, which is
              what AGENTS.md 8.13 asks for. */}
          <div className="min-w-0">
            <h3 className="truncate text-panel text-ink">Add System Personnel</h3>
            <p className="mt-0.5 text-label text-ink-muted">
              Register operational staff (Admin, Dispatcher, Delivery Rider)
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

          <form id="add-user-form" onSubmit={handleSubmit} noValidate className="space-y-6">
            {/* 1. ROLE SELECTION */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-micro uppercase text-ink">
                  1. Operational Role <span className="text-signal">*</span>
                </label>
                {fieldErrors.role && (
                  <span className="text-label text-status-act-ink">{fieldErrors.role}</span>
                )}
              </div>

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

            {/* 4. SECURITY & PASSWORD */}
            <div className="space-y-3 pt-3 border-t border-hairline">
              <label className="text-micro uppercase text-ink block">
                4. Account Password <span className="text-signal">*</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-label text-ink-muted mb-1">Password</label>
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
                    <p className="mt-1 text-label text-status-act-ink">{fieldErrors.password}</p>
                  )}
                </div>

                <div>
                  <label className="block text-label text-ink-muted mb-1">Confirm Password</label>
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
                      placeholder="Repeat password"
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
              <div className="bg-board-ground border border-edge rounded-plate p-3">
                <p className="text-micro uppercase text-ink-muted mb-2">
                  Password Strength Requirements
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
            form="add-user-form"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-2.5 rounded-plate bg-board-field hover:bg-board-field-deep text-white text-label flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <Check size={15} />
                <span>Save Personnel Account</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
