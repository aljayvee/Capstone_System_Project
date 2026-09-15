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
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60">
        <MailCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
        <p className="text-emerald-300 text-xs font-medium leading-relaxed">
          We sent a 6-digit verification code to{" "}
          <span className="font-bold text-white">{maskedEmail || "your email address"}</span>. This one-time check
          confirms the account belongs to you.
        </p>
      </div>

      {serverError && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60">
          <AlertCircle size={16} className="text-rose-400 shrink-0" />
          <p className="text-rose-300 text-sm font-medium">{serverError}</p>
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
              <InputOTPSlot key={index} index={index} className="border-slate-700 bg-slate-800 text-white" />
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
        className="w-full py-3.5 rounded-xl text-white flex items-center justify-center gap-2 bg-[#DC2626] hover:bg-red-700 font-bold text-sm tracking-wide transition-colors disabled:opacity-50 cursor-pointer"
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
          className="text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
        >
          Use a different account
        </button>

        <button
          type="button"
          onClick={() => void onResend()}
          disabled={!canResend}
          className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 transition disabled:text-slate-600 disabled:cursor-not-allowed cursor-pointer"
        >
          {isResending ? <Loader2 size={13} className="animate-spin" /> : <RotateCw size={13} />}
          <span>{resendIn > 0 ? `Resend in ${formatCountdown(resendIn)}` : "Resend code"}</span>
        </button>
      </div>
    </div>
  );
};
