import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Loader2,
  MailCheck,
  RotateCw,
  RotateCcw,
  Phone,
  Mail,
  CheckCircle2,
  ShieldCheck,
  TimerOff,
} from "lucide-react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../ui/input-otp";
import { auth } from "../../firebase/config";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
  type ConfirmationResult,
} from "firebase/auth";
import type { LoginChallengeFactor } from "../../services/apiService";

// The two-step verification screen shown between "your password was correct"
// and "you have a session".
//
// Two factors, offered as the server's `factors` allow:
// 1. SMS through Firebase Phone Auth. The server never sends the number, only
//    its last 4 digits, so the user types it; the server checks it matches.
// 2. Email code, mailed only when the user presses "Send code".

interface OtpStepProps {
  maskedEmail: string | null;
  maskedPhone?: string | null;
  // Last 4 digits of the account's mobile number.
  phoneHint?: string | null;
  factors: LoginChallengeFactor[];
  // False until a code was mailed for this sign-in.
  emailCodeSent: boolean;
  // Set when the server ended the challenge; the step then offers only a
  // fresh start.
  ended?: { title: string; message: string } | null;
  // Absolute epoch-ms deadlines, not durations, so a re-render or a slow tick
  // can never extend them.
  expiresAt: number;
  resendAvailableAt: number;
  serverError: string;
  onClearServerError?: () => void;
  isSubmitting: boolean;
  isResending: boolean;
  // Resolve false when the server refused, so the entered code is cleared.
  onSubmit: (code: string) => Promise<boolean>;
  onSubmitFirebasePhone?: (firebaseIdToken: string) => Promise<boolean>;
  onSendEmailCode: () => Promise<void>;
  onCancel: () => void;
}

type Channel = "SMS" | "EMAIL";

// Firebase refusals that mean SMS cannot be used right now, whatever number is
// typed: the useful next step is the email code.
const SMS_UNAVAILABLE_CODES = new Set([
  "auth/quota-exceeded",
  "auth/too-many-requests",
  "auth/unauthorized-domain",
  "auth/operation-not-allowed",
  "auth/captcha-check-failed",
  "auth/missing-client-identifier",
  "auth/network-request-failed",
  "auth/internal-error",
]);

function formatCountdown(msRemaining: number): string {
  const total = Math.max(0, Math.ceil(msRemaining / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatToE164(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("63") && digits.length === 12) {
    return "+" + digits;
  }
  if (digits.startsWith("0") && digits.length === 11) {
    return "+63" + digits.slice(1);
  }
  if (digits.length === 10 && digits.startsWith("9")) {
    return "+63" + digits;
  }
  if (input.trim().startsWith("+")) {
    return input.trim();
  }
  return input.trim();
}

// Shown for 09171234567 typed any way: "0917 123 4567".
function formatLocalNumber(e164: string): string {
  const local = "0" + e164.replace(/\D/g, "").slice(2);
  return local.length === 11 ? `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}` : e164;
}

function describeSmsSendError(err: any): { message: string; offerEmail: boolean } {
  const code = String(err?.code || "");
  if (code === "auth/quota-exceeded" || code === "auth/too-many-requests") {
    return {
      message: "Too many text messages were requested. Use the email code instead, or try SMS again later.",
      offerEmail: true,
    };
  }
  if (code === "auth/invalid-phone-number") {
    return { message: "Enter a Philippine mobile number, like 0917 123 4567.", offerEmail: false };
  }
  if (SMS_UNAVAILABLE_CODES.has(code)) {
    return { message: "Text messages can't be sent from here right now. Use the email code instead.", offerEmail: true };
  }
  return { message: "The text message couldn't be sent. Try again, or use the email code.", offerEmail: true };
}

export const OtpStep: React.FC<OtpStepProps> = ({
  maskedEmail,
  maskedPhone,
  phoneHint,
  factors,
  emailCodeSent,
  ended,
  expiresAt,
  resendAvailableAt,
  serverError,
  onClearServerError,
  isSubmitting,
  isResending,
  onSubmit,
  onSubmitFirebasePhone,
  onSendEmailCode,
  onCancel,
}) => {
  const hint = phoneHint && /^\d{4}$/.test(phoneHint) ? phoneHint : null;
  const smsAvailable = factors.includes("SMS") && hint !== null && Boolean(onSubmitFirebasePhone);
  const emailAvailable = factors.includes("EMAIL");

  const [activeChannel, setActiveChannel] = useState<Channel>(smsAvailable ? "SMS" : "EMAIL");
  const [emailCode, setEmailCode] = useState("");
  const [now, setNow] = useState(() => Date.now());

  // SMS State
  const [smsNumber, setSmsNumber] = useState("");
  const [sentToNumber, setSentToNumber] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [smsStatus, setSmsStatus] = useState<"IDLE" | "SENDING" | "SENT">("IDLE");
  const [smsError, setSmsError] = useState<{ message: string; offerEmail: boolean } | null>(null);
  const [smsResendSeconds, setSmsResendSeconds] = useState(0);
  const [isVerifyingSms, setIsVerifyingSms] = useState(false);

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const smsInputRef = useRef<HTMLInputElement>(null);
  // A refused code wants the cursor back in its boxes, but at that moment they
  // are still disabled from the request, and the browser drops focus() on a
  // disabled input. So the request is noted here and carried out by the effect
  // below once they are enabled again.
  const refocusRef = useRef<Channel | null>(null);

  // A single 1 Hz tick drives both countdowns — two intervals would drift apart
  // visibly within a minute.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // SMS resend countdown timer
  useEffect(() => {
    if (smsResendSeconds <= 0) return;
    const timer = setInterval(() => {
      setSmsResendSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [smsResendSeconds]);

  const clearRecaptcha = () => {
    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear();
      } catch {
        // ignore
      }
      recaptchaVerifierRef.current = null;
    }
  };

  // Cleanup reCAPTCHA on unmount
  useEffect(() => clearRecaptcha, []);

  // A fresh code means a fresh window, and the old digits mean nothing.
  useEffect(() => {
    setEmailCode("");
  }, [expiresAt]);

  const isBusy = isSubmitting || isVerifyingSms;

  useEffect(() => {
    if (isBusy || !refocusRef.current) return;
    (refocusRef.current === "EMAIL" ? emailInputRef : smsInputRef).current?.focus();
    refocusRef.current = null;
  });

  const expired = now >= expiresAt;
  const resendIn = Math.max(0, resendAvailableAt - now);
  const canSendEmail = resendIn === 0 && !isResending && !isBusy;

  const switchChannel = (channel: Channel) => {
    setActiveChannel(channel);
    setSmsError(null);
    onClearServerError?.();
  };

  const submitEmail = async (value: string) => {
    if (value.length !== 6 || isBusy || expired) return;
    const accepted = await onSubmit(value);
    if (!accepted) {
      refocusRef.current = "EMAIL";
      setEmailCode("");
    }
  };

  const initRecaptcha = () => {
    clearRecaptcha();
    recaptchaVerifierRef.current = new RecaptchaVerifier(auth, "login-recaptcha-container", {
      size: "invisible",
      callback: () => {},
      "expired-callback": () => {
        setSmsError({ message: "The security check expired. Send the code again.", offerEmail: false });
        setSmsStatus("IDLE");
      },
    });
  };

  const handleSendSms = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!hint || isBusy || smsStatus === "SENDING") return;
    setSmsError(null);
    onClearServerError?.();

    const cleanPhone = formatToE164(smsNumber);
    if (!/^\+639\d{9}$/.test(cleanPhone)) {
      setSmsError({ message: "Enter a Philippine mobile number, like 0917 123 4567.", offerEmail: false });
      return;
    }
    // Checked here so a typo costs nothing: no text is sent and no attempt is
    // used. The server still compares the whole number.
    if (cleanPhone.slice(-4) !== hint) {
      setSmsError({
        message: `That number doesn't end in ${hint}. Enter the mobile number on this account.`,
        offerEmail: false,
      });
      return;
    }

    setSmsStatus("SENDING");
    try {
      initRecaptcha();
      if (!recaptchaVerifierRef.current) {
        throw new Error("Unable to initialize security verification.");
      }
      confirmationResultRef.current = await signInWithPhoneNumber(auth, cleanPhone, recaptchaVerifierRef.current);
      setSentToNumber(cleanPhone);
      setSmsStatus("SENT");
      setSmsResendSeconds(60);
      setSmsCode("");
    } catch (err: any) {
      confirmationResultRef.current = null;
      setSmsError(describeSmsSendError(err));
      setSmsStatus("IDLE");
      clearRecaptcha();
    }
  };

  const handleVerifySms = async (customCode?: string) => {
    const codeVal = (customCode ?? smsCode).trim();
    if (codeVal.length !== 6 || isBusy || expired) return;
    if (!confirmationResultRef.current) {
      setSmsError({ message: "That code request is no longer open. Send a new code.", offerEmail: false });
      setSmsStatus("IDLE");
      return;
    }

    setSmsError(null);
    onClearServerError?.();
    setIsVerifyingSms(true);
    try {
      let idToken: string;
      try {
        const userCredential = await confirmationResultRef.current.confirm(codeVal);
        idToken = await userCredential.user.getIdToken();
      } catch (err: any) {
        const code = String(err?.code || "");
        if (code === "auth/code-expired") {
          confirmationResultRef.current = null;
          setSmsStatus("IDLE");
          setSmsError({ message: "That code expired. Send a new one.", offerEmail: false });
        } else if (code === "auth/too-many-requests") {
          confirmationResultRef.current = null;
          setSmsStatus("IDLE");
          setSmsError(describeSmsSendError(err));
        } else {
          refocusRef.current = "SMS";
          setSmsCode("");
          setSmsError({ message: "That code is not right. Check the text message and try again.", offerEmail: false });
        }
        return;
      }

      // The phone sign-in existed only to prove the number. Left signed in, it
      // stood in for the staff identity the session mints next
      // (ensureRealtimeSession), which the database rules refuse, so the live
      // map and chat stayed dark until the next sign-out.
      await signOut(auth).catch(() => {});
      confirmationResultRef.current = null;
      clearRecaptcha();

      const accepted = onSubmitFirebasePhone ? await onSubmitFirebasePhone(idToken) : false;
      if (!accepted) {
        // The proof was spent on the refusal (a number that is not this
        // account's, say), so only a new text can try again.
        setSmsStatus("IDLE");
        setSmsCode("");
      }
    } finally {
      setIsVerifyingSms(false);
    }
  };

  // Nothing typed can finish this sign-in: the server ended it, the clock ran
  // out, or the account has no factor this screen can use.
  const blocked =
    ended ??
    (expired
      ? { title: "This sign-in expired", message: "Codes only work for a few minutes. Start over to get a new one." }
      : !smsAvailable && !emailAvailable
      ? {
          title: "No way to verify here",
          message: "This account has no email or mobile number that can receive a code. Ask an owner to update it.",
        }
      : null);

  if (blocked) {
    return (
      <div className="space-y-4">
        <div role="alert" className="flex items-start gap-3 p-4 rounded-xl bg-slate-800/80 border border-slate-700">
          <TimerOff size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">{blocked.title}</p>
            <p className="text-xs text-slate-300 leading-relaxed">{blocked.message}</p>
          </div>
        </div>
        <button type="button" onClick={onCancel} className="login-submit">
          <RotateCcw size={16} />
          <span>Start over</span>
        </button>
      </div>
    );
  }

  const showTabs = smsAvailable && emailAvailable;
  const errorText = serverError || smsError?.message || "";
  const offerEmail = !serverError && Boolean(smsError?.offerEmail) && emailAvailable && activeChannel === "SMS";

  const tab = (channel: Channel, label: string, Icon: typeof Mail) => (
    <button
      type="button"
      role="tab"
      aria-selected={activeChannel === channel}
      onClick={() => switchChannel(channel)}
      disabled={isBusy}
      className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:cursor-not-allowed ${
        activeChannel === channel
          ? "bg-slate-800 text-white shadow-sm border border-slate-600/70"
          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
      }`}
    >
      <Icon size={14} className={activeChannel === channel ? "text-red-400" : "text-slate-400"} />
      <span>{label}</span>
    </button>
  );

  const cancelButton = (
    <button
      type="button"
      onClick={onCancel}
      className="text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer focus-visible:ring-1 focus-visible:ring-slate-400 rounded px-1"
    >
      Use a different account
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Invisible reCAPTCHA container for Firebase Phone Auth */}
      <div id="login-recaptcha-container" />

      {showTabs && (
        <div
          role="tablist"
          aria-label="Verification method"
          className="flex rounded-xl bg-slate-900/90 p-1 border border-slate-700/80 gap-1 select-none"
        >
          {tab("SMS", "Text message", Phone)}
          {tab("EMAIL", "Email", Mail)}
        </div>
      )}

      {errorText && (
        <div role="alert" className="flex items-start gap-2 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60">
          <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <p className="text-rose-300 text-xs sm:text-sm font-medium">{errorText}</p>
            {offerEmail && (
              <button
                type="button"
                onClick={() => switchChannel("EMAIL")}
                className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 underline underline-offset-2 cursor-pointer"
              >
                <Mail size={13} />
                <span>Use email instead</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* EMAIL CODE */}
      {activeChannel === "EMAIL" && !emailCodeSent && (
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-800/80 border border-slate-700">
            <Mail size={16} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-slate-200 text-xs font-medium leading-relaxed">
              We'll email a 6-digit code to{" "}
              <span className="font-bold text-white">{maskedEmail || "the email on this account"}</span>.
            </p>
          </div>

          <button type="button" onClick={() => void onSendEmailCode()} disabled={!canSendEmail} className="login-submit">
            {isResending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Sending...</span>
              </>
            ) : resendIn > 0 ? (
              <span className="font-mono tabular-nums">Send code in {formatCountdown(resendIn)}</span>
            ) : (
              <>
                <Mail size={16} />
                <span>Send code</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-between pt-1">{cancelButton}</div>
        </div>
      )}

      {activeChannel === "EMAIL" && emailCodeSent && (
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60">
            <MailCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-emerald-300 text-xs font-medium leading-relaxed">
              We sent a 6-digit code to{" "}
              <span className="font-bold text-white">{maskedEmail || "your email address"}</span>. It can take a
              minute to arrive.
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 pt-1">
            <InputOTP
              ref={emailInputRef}
              maxLength={6}
              pattern={REGEXP_ONLY_DIGITS}
              value={emailCode}
              onChange={(value) => {
                setEmailCode(value);
                if (serverError) onClearServerError?.();
                void submitEmail(value);
              }}
              disabled={isBusy}
              autoFocus
              aria-label="Email code"
            >
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <InputOTPSlot key={index} index={index} className="border-slate-700 bg-slate-800 text-white" />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          <button
            type="button"
            onClick={() => void submitEmail(emailCode)}
            disabled={emailCode.length !== 6 || isBusy}
            className="login-submit"
          >
            {isBusy ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <span>Verify &amp; sign in</span>
            )}
          </button>

          <div className="flex items-center justify-between pt-1">
            {cancelButton}
            <button
              type="button"
              onClick={() => void onSendEmailCode()}
              disabled={!canSendEmail}
              // The login panel recolours any text-red- class with a rule that
              // beats disabled:, so the colour is chosen here instead.
              className={`flex items-center gap-1.5 text-xs font-semibold transition disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer focus-visible:ring-1 focus-visible:ring-red-400 rounded px-1 ${
                canSendEmail ? "text-red-400 hover:text-red-300" : "text-slate-500"
              }`}
            >
              {isResending ? <Loader2 size={13} className="animate-spin" /> : <RotateCw size={13} />}
              <span className="font-mono tabular-nums">
                {resendIn > 0 ? `Resend in ${formatCountdown(resendIn)}` : "Resend code"}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* SMS CODE (Firebase Phone Auth) */}
      {activeChannel === "SMS" && smsStatus === "IDLE" && hint && (
        <form onSubmit={handleSendSms} noValidate className="space-y-4">
          <div>
            <label htmlFor="login-mfa-phone" className="login-label block mb-1.5">
              Enter the mobile number ending in <span className="font-mono">{hint}</span>
            </label>
            <div className="relative">
              <Phone
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                id="login-mfa-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={smsNumber}
                onChange={(e) => {
                  setSmsNumber(e.target.value);
                  if (smsError) setSmsError(null);
                  if (serverError) onClearServerError?.();
                }}
                placeholder={`09XX XXX ${hint}`}
                disabled={isBusy}
                autoFocus
                className="w-full pl-10 pr-4 py-3 rounded-xl outline-none text-sm font-mono transition-colors duration-150 text-white placeholder-slate-400 caret-red-500 disabled:opacity-60 border border-slate-700 bg-slate-800 focus:border-red-500"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400 leading-relaxed">
              {maskedPhone ? `The number on this account is ${maskedPhone}. ` : ""}We'll text it a 6-digit code.
            </p>
          </div>

          <button type="submit" disabled={isBusy || !smsNumber.trim()} className="login-submit">
            <Phone size={16} />
            <span>Send SMS code</span>
          </button>

          <div className="flex items-center justify-between pt-1">{cancelButton}</div>
        </form>
      )}

      {activeChannel === "SMS" && smsStatus === "SENDING" && (
        <div
          role="status"
          className="p-6 rounded-xl bg-slate-800/60 border border-slate-700/80 flex flex-col items-center justify-center text-center space-y-3"
        >
          <Loader2 size={28} className="animate-spin text-red-400" />
          <div>
            <p className="text-white text-sm font-semibold">Sending the code...</p>
            <p className="text-slate-400 text-xs mt-1">This takes a few seconds.</p>
          </div>
        </div>
      )}

      {activeChannel === "SMS" && smsStatus === "SENT" && (
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-emerald-300 text-xs font-medium leading-relaxed">
              We texted a 6-digit code to{" "}
              <span className="font-bold text-white font-mono">{formatLocalNumber(sentToNumber)}</span>.{" "}
              <button
                type="button"
                onClick={() => {
                  confirmationResultRef.current = null;
                  setSmsStatus("IDLE");
                  setSmsCode("");
                  setSmsError(null);
                }}
                disabled={isBusy}
                className="font-semibold text-red-400 hover:text-red-300 underline underline-offset-2 cursor-pointer"
              >
                Change number
              </button>
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 pt-1">
            <InputOTP
              ref={smsInputRef}
              maxLength={6}
              pattern={REGEXP_ONLY_DIGITS}
              value={smsCode}
              onChange={(value) => {
                setSmsCode(value);
                if (smsError) setSmsError(null);
                if (value.length === 6 && !isBusy) {
                  void handleVerifySms(value);
                }
              }}
              disabled={isBusy}
              autoFocus
              aria-label="SMS code"
            >
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <InputOTPSlot key={index} index={index} className="border-slate-700 bg-slate-800 text-white" />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          <button
            type="button"
            onClick={() => void handleVerifySms()}
            disabled={smsCode.length !== 6 || isBusy}
            className="login-submit"
          >
            {isBusy ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <span>Verify &amp; sign in</span>
            )}
          </button>

          <div className="flex items-center justify-between pt-1">
            {cancelButton}
            <button
              type="button"
              onClick={() => void handleSendSms()}
              disabled={smsResendSeconds > 0 || isBusy}
              className={`flex items-center gap-1.5 text-xs font-semibold transition disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer focus-visible:ring-1 focus-visible:ring-red-400 rounded px-1 ${
                smsResendSeconds > 0 || isBusy ? "text-slate-500" : "text-red-400 hover:text-red-300"
              }`}
            >
              <RotateCw size={13} />
              <span className="font-mono tabular-nums">
                {smsResendSeconds > 0 ? `Resend in ${smsResendSeconds}s` : "Resend SMS"}
              </span>
            </button>
          </div>
        </div>
      )}

      <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
        <ShieldCheck size={13} className="text-slate-400" />
        <span>
          This sign-in expires in{" "}
          <span className="font-mono tabular-nums text-slate-300 font-semibold">{formatCountdown(expiresAt - now)}</span>
        </span>
      </p>
    </div>
  );
};
