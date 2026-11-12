import { apiClient } from "./apiClient";

// Client for the staff "forgot password" endpoints (server:
// staffPasswordResetService). Every call resolves, never throws: a refusal comes
// back as { ok: false } carrying the server's own message, so the screens can
// show exactly what the server said.

export type ResetChannel = "EMAIL" | "SMS";

export interface FoundAccount {
  resetSessionToken: string;
  fullName: string;
  maskedEmail: string | null;
  maskedPhone: string | null;
  expiresInSeconds: number;
}

export type SendCodeResult =
  | { channel: "EMAIL"; maskedEmail: string; expiresInSeconds: number; resendAfterSeconds: number }
  | { channel: "SMS"; maskedPhone: string };

export interface ResetFailure {
  ok: false;
  error: string;
  status?: number;
  retryAfterSeconds?: number;
}

export type ResetResult<T> = ({ ok: true } & T) | ResetFailure;

// A type guard rather than `!result.ok`: this project compiles without
// strictNullChecks, where truthiness does not narrow a union.
export function isResetFailure<T>(result: ResetResult<T>): result is ResetFailure {
  return result.ok === false;
}

function toFailure(err: any, fallback: string): ResetFailure {
  const status: number | undefined = err?.response?.status;
  const data = err?.response?.data;
  const retryHeader = err?.response?.headers?.["retry-after"];
  const retryAfterSeconds =
    data?.details?.retryAfterSeconds ?? (retryHeader ? parseInt(retryHeader, 10) || undefined : undefined);
  // The API puts its message in `error` (rate limiters too); a bare network
  // failure has no response at all.
  const error = data?.error || (status ? fallback : "Unable to reach the server. Check your connection and try again.");
  return { ok: false, error, status, retryAfterSeconds };
}

async function post<T>(path: string, body: unknown, fallback: string): Promise<ResetResult<T>> {
  try {
    const response = await apiClient.post<T>(path, body);
    return { ok: true, ...(response.data as T) };
  } catch (err) {
    return toFailure(err, fallback);
  }
}

export const staffPasswordResetApi = {
  // `website` is the honeypot: always sent empty by a real browser.
  findAccount(identifier: string, website = "") {
    return post<FoundAccount>(
      "/auth/password-reset/find",
      { identifier, website },
      "We couldn't look up that account. Please try again."
    );
  },

  sendCode(resetSessionToken: string, channel: ResetChannel) {
    return post<SendCodeResult>(
      "/auth/password-reset/send-code",
      { resetSessionToken, channel },
      "We couldn't send a code right now. Please try again."
    );
  },

  verifyEmailCode(resetSessionToken: string, code: string) {
    return post<{ resetToken: string; expiresInSeconds: number }>(
      "/auth/password-reset/verify",
      { resetSessionToken, code },
      "We couldn't check that code. Please try again."
    );
  },

  verifySms(resetSessionToken: string, firebaseIdToken: string) {
    return post<{ resetToken: string; expiresInSeconds: number }>(
      "/auth/password-reset/verify",
      { resetSessionToken, firebaseIdToken },
      "We couldn't confirm your mobile number. Please try again."
    );
  },

  complete(resetToken: string, password: string) {
    return post<{ message: string }>(
      "/auth/password-reset/complete",
      { resetToken, password },
      "We couldn't save your new password. Please try again."
    );
  },
};
