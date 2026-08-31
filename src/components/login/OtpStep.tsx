import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, MailCheck, RotateCw } from "lucide-react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../ui/input-otp";

// The one-time code screen shown between "your password was correct" and "you
// have a session".
//
// Presentational: LoginPage owns the challenge token and makes every API call.
// This component owns only what the user is typing and the two countdowns.

interface OtpStepProps {
  maskedEmail: string | null;
  // Absolute epoch-ms deadlines, not durations, so a re-render or a slow tick
  // can never extend them.
  expiresAt: number;
  resendAvailableAt: number;
  serverError: string;
  isSubmitting: boolean;
  isResending: boolean;
  onSubmit: (code: string) => Promise<void>;
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

export const OtpStep: React.FC<OtpStepProps> = ({
  maskedEmail,
  expiresAt,
  resendAvailableAt,
  serverError,
  isSubmitting,
  isResending,
  onSubmit,
  onResend,
  onExpire,
  onCancel,
}) => {
  const [code, setCode] = useState("");
  const [now, setNow] = useState(() => Date.now());

  // A single 1 Hz tick drives both countdowns — two intervals would drift apart
  // visibly within a minute.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
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
    setCode("");
  }, [expiresAt]);

  const resendIn = Math.max(0, resendAvailableAt - now);
  const canResend = resendIn === 0 && !isResending && !isSubmitting && !expired;

  const submit = (value: string) => {
    if (value.length === 6 && !isSubmitting) {
      void onSubmit(value);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
        <MailCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
        <p className="text-emerald-800 text-xs font-medium leading-relaxed">
          We sent a 6-digit verification code to{" "}
          <span className="font-bold">{maskedEmail || "your email address"}</span>. This one-time check
          confirms the account belongs to you.
        </p>
      </div>

      {serverError && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
          <AlertCircle size={16} className="text-red-500 shrink-0" />
          <p className="text-red-600 text-sm font-medium">{serverError}</p>
        </div>
      )}

      <div className="flex flex-col items-center gap-3 pt-1">
        <InputOTP
          maxLength={6}
          pattern={REGEXP_ONLY_DIGITS}
          value={code}
          onChange={(value) => {
            setCode(value);
            // Auto-submit the moment the last digit lands — with a six-box
            // input, making the user reach for a button afterwards is friction
            // for no gain.
            submit(value);
          }}
          disabled={isSubmitting || expired}
          autoFocus
        >
          <InputOTPGroup>
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <InputOTPSlot key={index} index={index} />
            ))}
          </InputOTPGroup>
        </InputOTP>

        <p className="text-[11px] text-slate-400 font-medium">
          {expired ? "This sign-in expired." : `This sign-in expires in ${formatCountdown(expiresAt - now)}`}
        </p>
      </div>

      <button
        type="button"
        onClick={() => submit(code)}
        disabled={code.length !== 6 || isSubmitting || expired}
        className="w-full py-3 rounded-xl text-white flex items-center justify-center gap-2 bg-[#1E3A5F] hover:bg-[#162D4A] font-semibold text-sm transition-all shadow-md disabled:opacity-50 cursor-pointer"
      >
        {isSubmitting ? (
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
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          Use a different account
        </button>

        <button
          type="button"
          onClick={() => void onResend()}
          disabled={!canResend}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#1E3A5F] hover:text-[#162D4A] transition disabled:text-slate-400 disabled:cursor-not-allowed"
        >
          {isResending ? <Loader2 size={13} className="animate-spin" /> : <RotateCw size={13} />}
          <span>{resendIn > 0 ? `Resend in ${formatCountdown(resendIn)}` : "Resend code"}</span>
        </button>
      </div>
    </div>
  );
};
