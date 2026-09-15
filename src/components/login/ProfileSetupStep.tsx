import React, { useState } from "react";
import { AlertCircle, ChevronRight, Loader2, ShieldCheck } from "lucide-react";
import { validateEmail, validateName } from "../../utils/userValidation";

// First-run identity form for the seeded bootstrap admin. The account ships
// with a placeholder name and an unreachable email, so before it can be used it
// has to say who is actually behind it and give an address that can receive the
// verification code that follows.
//
// The rules come from src/utils/userValidation.ts — the same module the Add
// User modal uses, mirroring the server's personName/strictEmail schemas — so
// what this form rejects and what the server rejects cannot drift apart.

interface ProfileSetupStepProps {
  onSubmit: (input: { firstName: string; middleName: string; lastName: string; email: string }) => Promise<void>;
  onCancel: () => void;
  serverError: string;
  isSubmitting: boolean;
}

type FieldKey = "firstName" | "middleName" | "lastName" | "email";

const fieldClass = (hasError: boolean) =>
  `w-full px-4 py-3 rounded-xl outline-none border bg-slate-800 text-white placeholder-slate-400 caret-red-500 text-sm transition disabled:opacity-60 ${
    hasError
      ? "border-rose-500 bg-rose-950/30"
      : "border-slate-700 focus:border-red-500"
  }`;

export const ProfileSetupStep: React.FC<ProfileSetupStepProps> = ({
  onSubmit,
  onCancel,
  serverError,
  isSubmitting,
}) => {
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});

  const clearError = (field: FieldKey) =>
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const next: Partial<Record<FieldKey, string>> = {};
    const set = (key: FieldKey, message: string | null) => {
      if (message) next[key] = message;
    };
    set("firstName", validateName(firstName, "First name"));
    set("middleName", validateName(middleName, "Middle name", false));
    set("lastName", validateName(lastName, "Last name"));
    set("email", validateEmail(email));

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    await onSubmit({
      firstName: firstName.trim(),
      middleName: middleName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
    });
  };

  const fieldError = (key: FieldKey) =>
    errors[key] ? <p className="mt-1 text-[11px] font-semibold text-rose-400">{errors[key]}</p> : null;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-950/40 border border-blue-800/60">
        <ShieldCheck size={16} className="text-blue-400 shrink-0 mt-0.5" />
        <p className="text-blue-300 text-xs font-medium leading-relaxed">
          This administrator account is still using its default setup details. Enter your real name and a
          working email address to continue. We will send a verification code there next.
        </p>
      </div>

      {serverError && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60">
          <AlertCircle size={16} className="text-rose-400 shrink-0" />
          <p className="text-rose-300 text-sm font-medium">{serverError}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block mb-1.5 text-slate-300 text-xs font-semibold uppercase tracking-wider">First Name</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value);
              clearError("firstName");
            }}
            placeholder="Juan"
            disabled={isSubmitting}
            className={fieldClass(!!errors.firstName)}
          />
          {fieldError("firstName")}
        </div>
        <div>
          <label className="block mb-1.5 text-slate-300 text-xs font-semibold uppercase tracking-wider">Last Name</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => {
              setLastName(e.target.value);
              clearError("lastName");
            }}
            placeholder="Dela Cruz"
            disabled={isSubmitting}
            className={fieldClass(!!errors.lastName)}
          />
          {fieldError("lastName")}
        </div>
      </div>

      <div>
        <label className="block mb-1.5 text-slate-300 text-xs font-semibold uppercase tracking-wider">
          Middle Name <span className="text-slate-500 font-normal lowercase">(optional)</span>
        </label>
        <input
          type="text"
          value={middleName}
          onChange={(e) => {
            setMiddleName(e.target.value);
            clearError("middleName");
          }}
          placeholder="Santos"
          disabled={isSubmitting}
          className={fieldClass(!!errors.middleName)}
        />
        {fieldError("middleName")}
      </div>

      <div>
        <label className="block mb-1.5 text-slate-300 text-xs font-semibold uppercase tracking-wider">Email Address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value.replace(/\s/g, ""));
            clearError("email");
          }}
          placeholder="juandelacruz@gmail.com"
          disabled={isSubmitting}
          className={fieldClass(!!errors.email)}
        />
        {errors.email ? (
          fieldError("email")
        ) : (
          <p className="mt-1 text-[11px] text-slate-400 font-medium">
            Use an active inbox you can access immediately: the verification code will be sent here.
          </p>
        )}
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-3 rounded-xl border border-slate-700 text-slate-300 font-semibold text-sm hover:bg-slate-800 transition disabled:opacity-60 cursor-pointer focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:outline-none"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 py-3.5 rounded-xl text-white flex items-center justify-center gap-2 bg-[#DC2626] hover:bg-red-700 font-bold text-sm tracking-wide transition-colors disabled:opacity-70 cursor-pointer focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B132B]"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <span>Save &amp; Send Code</span>
              <ChevronRight size={16} />
            </>
          )}
        </button>
      </div>
    </form>
  );
};
