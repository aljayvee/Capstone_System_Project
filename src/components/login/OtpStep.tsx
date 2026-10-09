import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Loader2,
  MailCheck,
  RotateCw,
  Phone,
  Mail,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../ui/input-otp";
import { auth } from "../../firebase/config";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";

// The one-time code screen shown between "your password was correct" and "you
// have a session".
//
// Supports dual-channel authentication:
// 1. Email (Gmail) OTP via server SMTP
// 2. SMS OTP via Google Cloud Firebase Phone Auth

interface OtpStepProps {
  maskedEmail: string | null;
  maskedPhone?: string | null;
  phone?: string | null;
  // Absolute epoch-ms deadlines, not durations, so a re-render or a slow tick
  // can never extend them.
  expiresAt: number;
  resendAvailableAt: number;
  serverError: string;
  isSubmitting: boolean;
  isResending: boolean;
  onSubmit: (code: string) => Promise<void>;
  onSubmitFirebasePhone?: (firebaseIdToken: string) => Promise<void>;
  onResend: () => Promise<void>;
  onExpire: () => void;
  onCancel: () => void;
}

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

export const OtpStep: React.FC<OtpStepProps> = ({
  maskedEmail,
  maskedPhone,
  phone,
  expiresAt,
  resendAvailableAt,
  serverError,
  isSubmitting,
  isResending,
  onSubmit,
  onSubmitFirebasePhone,
  onResend,
  onExpire,
  onCancel,
}) => {
  const [activeChannel, setActiveChannel] = useState<"EMAIL" | "SMS">("EMAIL");
  const [emailCode, setEmailCode] = useState("");
  const [now, setNow] = useState(() => Date.now());

  // SMS State
  const [smsCode, setSmsCode] = useState("");
  const [smsStatus, setSmsStatus] = useState<"IDLE" | "SENDING" | "SENT">("IDLE");
  const [smsError, setSmsError] = useState<string | null>(null);
  const [smsResendSeconds, setSmsResendSeconds] = useState(0);
  const [isVerifyingSms, setIsVerifyingSms] = useState(false);

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);

  const hasPhone = Boolean(phone || maskedPhone);

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

  // Cleanup reCAPTCHA on unmount
  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {
          // ignore
        }
        recaptchaVerifierRef.current = null;
      }
    };
  }, []);

  const expired = now >= expiresAt;

  // onExpire tears down state in the parent, so it must fire from an effect
  // rather than during render.
  const hasExpiredRef = useRef(false);
  useEffect(() => {
    if (expired && !hasExpiredRef.current) {
      hasExpiredRef.current = true;
      onExpire();
    }
  }, [expired, onExpire]);

  // A fresh code means a fresh window — let the guard fire again.
  useEffect(() => {
    hasExpiredRef.current = false;
    setEmailCode("");
  }, [expiresAt]);

  const resendIn = Math.max(0, resendAvailableAt - now);
  const canResendEmail = resendIn === 0 && !isResending && !isSubmitting && !expired;

  const submitEmail = (value: string) => {
    if (value.length === 6 && !isSubmitting) {
      void onSubmit(value);
    }
  };

  const initRecaptcha = () => {
    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear();
      } catch {
        // ignore
      }
      recaptchaVerifierRef.current = null;
    }

    recaptchaVerifierRef.current = new RecaptchaVerifier(auth, "login-recaptcha-container", {
      size: "invisible",
      callback: () => {},
      "expired-callback": () => {
        setSmsError("Security check expired. Please try again.");
        setSmsStatus("IDLE");
      },
    });
  };

  const handleSendSms = async () => {
    setSmsError(null);
    const targetPhone = phone || maskedPhone;
    if (!targetPhone) {
      setSmsError("No phone number associated with this account.");
      return;
    }
    const cleanPhone = formatToE164(targetPhone);
    if (!cleanPhone.startsWith("+63") || cleanPhone.length !== 13) {
      setSmsError("The registered phone number is not a valid Philippine mobile number (+639XXXXXXXXX).");
      return;
    }

    setSmsStatus("SENDING");
    try {
      initRecaptcha();
      if (!recaptchaVerifierRef.current) {
        throw new Error("Unable to initialize security verification.");
      }
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        cleanPhone,
        recaptchaVerifierRef.current
      );
      confirmationResultRef.current = confirmationResult;
      setSmsStatus("SENT");
      setSmsResendSeconds(60);
      setSmsCode("");
    } catch (err: any) {
      console.error("SMS login challenge error:", err);
      let msg = err?.message || "Failed to dispatch SMS verification code.";
      if (err?.code === "auth/invalid-phone-number") {
        msg = "Invalid phone number format on account.";
      } else if (err?.code === "auth/quota-exceeded") {
        msg = "Daily SMS quota reached. Please use Email verification.";
      } else if (err?.code === "auth/unauthorized-domain") {
        msg = "Domain not authorized for phone authentication in Firebase.";
      }
      setSmsError(msg);
      setSmsStatus("IDLE");
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {
          // ignore
        }
        recaptchaVerifierRef.current = null;
      }
    }
  };

  const handleVerifySms = async (customCode?: string) => {
    const codeVal = (customCode ?? smsCode).trim();
    if (codeVal.length !== 6) return;
    if (!confirmationResultRef.current) {
      setSmsError("Session expired. Please request a new SMS code.");
      setSmsStatus("IDLE");
      return;
    }

    setSmsError(null);
    setIsVerifyingSms(true);
    try {
      const userCredential = await confirmationResultRef.current.confirm(codeVal);
      const idToken = await userCredential.user.getIdToken();
      confirmationResultRef.current = null;
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {
          // ignore
        }
        recaptchaVerifierRef.current = null;
      }
      if (onSubmitFirebasePhone) {
        await onSubmitFirebasePhone(idToken);
      }
    } catch (err: any) {
      console.error("SMS verification failed:", err);
      let msg = "Invalid verification code. Please check and try again.";
      if (err?.code === "auth/invalid-verification-code") {
        msg = "Incorrect SMS code. Please re-enter the 6 digits sent to your phone.";
      } else if (err?.code === "auth/code-expired") {
        msg = "SMS verification code has expired. Please request a new code.";
      }
      setSmsError(msg);
    } finally {
      setIsVerifyingSms(false);
    }
  };

  const isBusy = isSubmitting || isVerifyingSms;

  return (
    <div className="space-y-4">
      {/* Invisible reCAPTCHA container for Firebase Phone Auth */}
      <div id="login-recaptcha-container" />

      {/* Dual-Channel Selector Tabs */}
      <div className="flex rounded-xl bg-slate-900/90 p-1 border border-slate-700/80 gap-1 select-none">
        <button
          type="button"
          onClick={() => {
            setActiveChannel("EMAIL");
            setSmsError(null);
          }}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeChannel === "EMAIL"
              ? "bg-slate-800 text-white shadow-sm border border-slate-600/70"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
          }`}
        >
          <Mail size={14} className={activeChannel === "EMAIL" ? "text-red-400" : "text-slate-400"} />
          <span>Email (Gmail)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (hasPhone) {
              setActiveChannel("SMS");
              setSmsError(null);
            }
          }}
          disabled={!hasPhone}
          title={hasPhone ? "Verify with SMS OTP" : "No registered phone number"}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            !hasPhone
              ? "text-slate-600 cursor-not-allowed opacity-60"
              : activeChannel === "SMS"
              ? "bg-slate-800 text-white shadow-sm border border-slate-600/70 cursor-pointer"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 cursor-pointer"
          }`}
        >
          <Phone size={14} className={activeChannel === "SMS" ? "text-red-400" : "text-slate-400"} />
          <span>SMS OTP</span>
          {!hasPhone && <span className="text-[10px] text-slate-500 font-normal">(Unavailable)</span>}
        </button>
      </div>

      {/* Server or SMS Error Alert */}
      {(serverError || smsError) && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60">
          <AlertCircle size={16} className="text-rose-400 shrink-0" />
          <p className="text-rose-300 text-xs sm:text-sm font-medium">{serverError || smsError}</p>
        </div>
      )}

      {/* CHANNEL 1: EMAIL (GMAIL) OTP */}
      {activeChannel === "EMAIL" && (
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60">
            <MailCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-emerald-300 text-xs font-medium leading-relaxed">
              We sent a 6-digit verification code to{" "}
              <span className="font-bold text-white">{maskedEmail || "your email address"}</span>. Enter it below to sign in.
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 pt-1">
            <InputOTP
              maxLength={6}
              pattern={REGEXP_ONLY_DIGITS}
              value={emailCode}
              onChange={(value) => {
                setEmailCode(value);
                submitEmail(value);
              }}
              disabled={isBusy || expired}
              autoFocus
            >
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <InputOTPSlot key={index} index={index} className="border-slate-700 bg-slate-800 text-white" />
                ))}
              </InputOTPGroup>
            </InputOTP>

            <p className="text-[11px] text-slate-400 font-medium">
              {expired ? (
                "This sign-in expired."
              ) : (
                <>
                  This sign-in expires in{" "}
                  <span className="font-mono tabular-nums text-slate-300 font-semibold">{formatCountdown(expiresAt - now)}</span>
                </>
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={() => submitEmail(emailCode)}
            disabled={emailCode.length !== 6 || isBusy || expired}
            className="w-full py-3.5 rounded-xl text-white flex items-center justify-center gap-2 bg-[#DC2626] hover:bg-red-700 font-bold text-sm tracking-wide transition-colors disabled:opacity-50 cursor-pointer focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B132B]"
          >
            {isBusy ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <span>Verify &amp; Sign In</span>
            )}
          </button>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer focus-visible:ring-1 focus-visible:ring-slate-400 rounded px-1"
            >
              Use a different account
            </button>

            <button
              type="button"
              onClick={() => void onResend()}
              disabled={!canResendEmail}
              className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 transition disabled:text-slate-500 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer focus-visible:ring-1 focus-visible:ring-red-400 rounded px-1"
            >
              {isResending ? <Loader2 size={13} className="animate-spin" /> : <RotateCw size={13} />}
              <span className="font-mono tabular-nums">{resendIn > 0 ? `Resend in ${formatCountdown(resendIn)}` : "Resend code"}</span>
            </button>
          </div>
        </div>
      )}

      {/* CHANNEL 2: PHONE (SMS) OTP */}
      {activeChannel === "SMS" && (
        <div className="space-y-4">
          {smsStatus === "IDLE" && (
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                <ShieldCheck size={16} className="text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <p className="text-slate-200 font-medium leading-relaxed">
                    Authenticate using SMS verification sent to:
                  </p>
                  <p className="font-mono font-bold text-white tracking-wider text-sm">
                    {maskedPhone || phone || "Registered Phone Number"}
                  </p>
                  <p className="text-slate-400 text-[11px] leading-relaxed pt-0.5">
                    Google Cloud Phone Authentication will deliver a 6-digit one-time passcode to verify your device.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSendSms}
                disabled={isBusy}
                className="w-full py-3.5 rounded-xl text-white flex items-center justify-center gap-2 bg-[#DC2626] hover:bg-red-700 font-bold text-sm tracking-wide transition-colors disabled:opacity-50 cursor-pointer focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B132B]"
              >
                <Phone size={15} />
                <span>Send SMS Verification Code</span>
              </button>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={onCancel}
                  className="text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer focus-visible:ring-1 focus-visible:ring-slate-400 rounded px-1"
                >
                  Use a different account
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChannel("EMAIL")}
                  className="text-xs font-semibold text-red-400 hover:text-red-300 transition cursor-pointer"
                >
                  Switch to Email OTP
                </button>
              </div>
            </div>
          )}

          {smsStatus === "SENDING" && (
            <div className="p-6 rounded-xl bg-slate-800/60 border border-slate-700/80 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 size={28} className="animate-spin text-red-400" />
              <div>
                <p className="text-white text-sm font-semibold">Contacting Google Cloud SMS...</p>
                <p className="text-slate-400 text-xs mt-1">Verifying device integrity and dispatching OTP code</p>
              </div>
            </div>
          )}

          {smsStatus === "SENT" && (
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-emerald-300 text-xs font-medium leading-relaxed">
                  SMS code dispatched to <span className="font-bold text-white">{maskedPhone || phone}</span>. Enter the 6-digit code below:
                </p>
              </div>

              <div className="flex flex-col items-center gap-3 pt-1">
                <InputOTP
                  maxLength={6}
                  pattern={REGEXP_ONLY_DIGITS}
                  value={smsCode}
                  onChange={(value) => {
                    setSmsCode(value);
                    if (value.length === 6 && !isBusy) {
                      void handleVerifySms(value);
                    }
                  }}
                  disabled={isBusy}
                  autoFocus
                >
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <InputOTPSlot key={index} index={index} className="border-slate-700 bg-slate-800 text-white" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>

                <p className="text-[11px] text-slate-400 font-medium">
                  {smsResendSeconds > 0 ? (
                    <>
                      Resend available in{" "}
                      <span className="font-mono tabular-nums text-slate-300 font-semibold">{smsResendSeconds}s</span>
                    </>
                  ) : (
                    "You can now request a new SMS code."
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() => void handleVerifySms()}
                disabled={smsCode.length !== 6 || isBusy}
                className="w-full py-3.5 rounded-xl text-white flex items-center justify-center gap-2 bg-[#DC2626] hover:bg-red-700 font-bold text-sm tracking-wide transition-colors disabled:opacity-50 cursor-pointer focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B132B]"
              >
                {isBusy ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Verifying SMS...</span>
                  </>
                ) : (
                  <span>Verify SMS &amp; Sign In</span>
                )}
              </button>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={onCancel}
                  className="text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer focus-visible:ring-1 focus-visible:ring-slate-400 rounded px-1"
                >
                  Use a different account
                </button>

                <button
                  type="button"
                  onClick={handleSendSms}
                  disabled={smsResendSeconds > 0 || isBusy}
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 transition disabled:text-slate-500 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer focus-visible:ring-1 focus-visible:ring-red-400 rounded px-1"
                >
                  <RotateCw size={13} className={isBusy ? "animate-spin" : ""} />
                  <span className="font-mono tabular-nums">
                    {smsResendSeconds > 0 ? `Resend in ${smsResendSeconds}s` : "Resend SMS"}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
