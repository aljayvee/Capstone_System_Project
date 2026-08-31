// Field rules shared by AddUserModal and EditUserModal so a rule can never
// drift between "create an account" and "edit an account".
//
// These are mirrored server-side in Backend/src/server.js: the copy here is
// UX (fast, inline, specific), the server copy is the actual gate — a request
// crafted outside the form still hits the same rules.

export const PH_MOBILE_LENGTH = 11;

// Used as the phone field's onChange sanitizer, so a non-digit can never even
// be typed in — the validator below is the backstop for paste/autofill.
export function sanitizePhoneInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, PH_MOBILE_LENGTH);
}

export function validatePhone(phone: string): string | null {
  const value = (phone || "").trim();
  if (!value) return "Phone number is required.";
  if (!/^\d+$/.test(value)) {
    return "Phone number may contain digits only — no letters, spaces, or symbols.";
  }
  if (!value.startsWith("09")) {
    return "Philippine mobile numbers must start with 09 (e.g. 09171234567).";
  }
  if (value.length !== PH_MOBILE_LENGTH) {
    return `Phone number must be exactly ${PH_MOBILE_LENGTH} digits (you entered ${value.length}).`;
  }
  return null;
}

// Deliberately an allow-list, not a "looks like an email" regex: a typo'd
// domain (gmial.com, outlok.com) passes any shape check but can never receive
// a password reset. Extend this list when the business adopts a new provider.
export const ALLOWED_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "yahoo.com.ph",
  "outlook.com",
  "outlook.ph",
  "hotmail.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "proton.me",
  "protonmail.com",
  "aol.com",
  "zoho.com",
  "gmx.com",
  "mail.com",
  "yandex.com",
];

const EMAIL_SHAPE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export function validateEmail(email: string): string | null {
  const value = (email || "").trim();
  if (!value) return "Email address is required.";
  if (/\s/.test(value)) return "Email address cannot contain spaces.";
  if (!EMAIL_SHAPE.test(value)) {
    return "Enter a complete email address (e.g. juandelacruz@gmail.com).";
  }
  const domain = value.split("@")[1].toLowerCase();
  if (!ALLOWED_EMAIL_DOMAINS.includes(domain)) {
    return `"@${domain}" is not an accepted email provider. Use one of: ${ALLOWED_EMAIL_DOMAINS.slice(0, 4)
      .map((d) => `@${d}`)
      .join(", ")}, etc.`;
  }
  return null;
}

// Rendered as a live checklist under the password field so the rules are
// visible before the operator hits Save, not after.
export interface PasswordRule {
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { label: "No spaces or blank characters", test: (pw) => pw.length > 0 && !/\s/.test(pw) },
  { label: "At least one letter", test: (pw) => /[A-Za-z]/.test(pw) },
  { label: "At least one number", test: (pw) => /\d/.test(pw) },
];

export function validatePassword(password: string): string | null {
  const value = password || "";
  if (!value) return "Password is required.";
  if (!value.trim()) return "Password cannot be blank spaces.";
  if (/\s/.test(value)) return "Password cannot contain spaces or tabs.";
  if (value.length < 8) return "Password must be at least 8 characters long.";
  if (!/[A-Za-z]/.test(value)) return "Password must contain at least one letter.";
  if (!/\d/.test(value)) return "Password must contain at least one number.";
  return null;
}

export function validateConfirmPassword(password: string, confirmPassword: string): string | null {
  if (!confirmPassword) return "Please re-type the password to confirm it.";
  if (password !== confirmPassword) return "Passwords do not match.";
  return null;
}

export function validateUsername(username: string): string | null {
  const value = (username || "").trim();
  if (!value) return "Username is required.";
  if (value.length < 3) return "Username must be at least 3 characters long.";
  if (!/^[A-Za-z0-9_.-]+$/.test(value)) {
    return "Username may only contain letters, numbers, dots, dashes, and underscores.";
  }
  return null;
}

// Names are person names, not free text: blank-space-only input and digits are
// both rejected so a row can never render as an empty avatar with no label.
export function validateName(value: string, fieldLabel: string, required = true): string | null {
  const trimmed = (value || "").trim();
  if (!trimmed) return required ? `${fieldLabel} is required.` : null;
  if (trimmed.length < 2) return `${fieldLabel} must be at least 2 characters long.`;
  if (!/^[A-Za-zÑñ.\-'\s]+$/.test(trimmed)) {
    return `${fieldLabel} may only contain letters, spaces, hyphens, apostrophes, and dots.`;
  }
  return null;
}

export function validateRole(role: string): string | null {
  if (!role) return "Please assign a role — an account cannot be saved as Not Assigned.";
  if (!["rider", "dispatcher", "owner"].includes(String(role).toLowerCase())) {
    return "Please choose a valid role.";
  }
  return null;
}
