import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import { auth } from "../firebase/config";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
  type ConfirmationResult,
} from "firebase/auth";
import {
  Phone,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "../components/ui/input-otp";

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

export const PhoneVerificationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const rawPhone = searchParams.get("phone") || "";
  const redirectUrl = searchParams.get("redirect") || "";

  const [phone, setPhone] = useState(() => (rawPhone ? formatToE164(rawPhone) : "+63"));
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"PHONE" | "CODE" | "SUCCESS" | "EXPIRED">("PHONE");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [returnAppUrl, setReturnAppUrl] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);

  // Check if this verification link or phone session has already been consumed/expired
  useEffect(() => {
    const isCurrentSessionExpired = sessionStorage.getItem("sugo_current_otp_session_expired") === "true";
    const clean = rawPhone ? formatToE164(rawPhone) : "";
    let isPhoneExpired = false;

    if (clean) {
      try {
        const sessionRecord = sessionStorage.getItem(`sugo_otp_consumed_${clean}`);
        const localRecord = localStorage.getItem(`sugo_otp_consumed_${clean}`);
        const recordStr = sessionRecord || localRecord;
        if (recordStr) {
          const parsed = JSON.parse(recordStr);
          // Link expires for 2 hours post-verification
          if (parsed?.status === "EXPIRED" && Date.now() - (parsed?.verifiedAt || 0) < 2 * 60 * 60 * 1000) {
            isPhoneExpired = true;
          }
        }
      } catch {
        // ignore json parse error
      }
    }

    if (isCurrentSessionExpired || isPhoneExpired) {
      setStep("EXPIRED");
    }
  }, [rawPhone]);

  // Resend countdown timer effect
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const initRecaptcha = () => {
    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear();
      } catch {
        // ignore
      }
      recaptchaVerifierRef.current = null;
    }

    recaptchaVerifierRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
      callback: () => {
        setStatusMessage("Security check passed. Sending SMS...");
      },
      "expired-callback": () => {
        setErrorMessage("Verification expired. Please try again.");
        setLoading(false);
      },
    });
  };

  const handleSendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    const cleanPhone = formatToE164(phone);
    if (!cleanPhone.startsWith("+63") || cleanPhone.length !== 13) {
      setErrorMessage("Please enter a valid Philippine mobile number (e.g. 09171234567 or +639171234567).");
      return;
    }

    setLoading(true);
    setStatusMessage("Checking device security...");

    try {
      initRecaptcha();
      if (!recaptchaVerifierRef.current) {
        throw new Error("Failed to initialize security verification.");
      }

      setStatusMessage("Dispatching SMS code via Google Cloud...");
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        cleanPhone,
        recaptchaVerifierRef.current
      );

      confirmationResultRef.current = confirmationResult;
      setStatusMessage("Verification code sent to your phone!");
      setResendCountdown(60);
      setCode("");
      setStep("CODE");
    } catch (err: any) {
      console.error("Firebase Phone Auth error:", err);
      let msg = err?.message || "Failed to send verification SMS";
      if (err?.code === "auth/invalid-phone-number") {
        msg = "Invalid phone number format. Please ensure it begins with +639 followed by 9 digits.";
      } else if (err?.code === "auth/quota-exceeded") {
        msg = "Daily SMS quota exceeded. Please try again later or contact support.";
      } else if (err?.code === "auth/unauthorized-domain") {
        msg = "This domain is not authorized for phone authentication.";
      } else if (err?.code === "auth/missing-client-identifier") {
        msg = "Security verification failed. Please refresh the page and try again.";
      }
      setErrorMessage(msg);
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {
          // ignore
        }
        recaptchaVerifierRef.current = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e?: React.FormEvent, customCode?: string) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    const cleanCode = (customCode ?? code).trim();
    if (cleanCode.length !== 6) {
      setErrorMessage("Please enter the complete 6-digit code received via SMS.");
      return;
    }

    if (!confirmationResultRef.current) {
      setErrorMessage("Session expired. Please request a new code.");
      setStep("PHONE");
      return;
    }

    setLoading(true);
    setStatusMessage("Verifying code...");

    try {
      const userCredential = await confirmationResultRef.current.confirm(cleanCode);
      const user = userCredential.user;
      const idToken = await user.getIdToken();
      const verifiedPhone = user.phoneNumber || phone;
      const cleanVerifiedPhone = formatToE164(verifiedPhone);

      // 1. Immediately invalidate & record expiration for this verification link/session
      const expirationRecord = {
        phone: cleanVerifiedPhone,
        verifiedAt: Date.now(),
        status: "EXPIRED",
        reason: "LINK_CONSUMED",
      };
      try {
        sessionStorage.setItem(`sugo_otp_consumed_${cleanVerifiedPhone}`, JSON.stringify(expirationRecord));
        localStorage.setItem(`sugo_otp_consumed_${cleanVerifiedPhone}`, JSON.stringify(expirationRecord));
        sessionStorage.setItem("sugo_current_otp_session_expired", "true");
      } catch (e) {
        console.warn("Could not record session expiration:", e);
      }

      // 2. Destroy confirmation result reference and reCAPTCHA verifier to prevent replay
      confirmationResultRef.current = null;
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {
          // ignore
        }
        recaptchaVerifierRef.current = null;
      }

      // 3. Immediately sign out the web domain's temporary Firebase auth session
      try {
        await signOut(auth);
      } catch (e) {
        console.warn("Web auth session cleanup:", e);
      }

      // 4. Sanitize sensitive URL params in browser address bar and history
      try {
        window.history.replaceState(null, "", window.location.pathname);
      } catch {
        // ignore
      }

      setStep("SUCCESS");
      setStatusMessage("Phone number verified successfully!");

      if (redirectUrl) {
        const separator = redirectUrl.includes("?") ? "&" : "?";
        const finalUrl = `${redirectUrl}${separator}token=${encodeURIComponent(idToken)}&phone=${encodeURIComponent(verifiedPhone)}`;
        setReturnAppUrl(finalUrl);

        // Auto-redirect back to mobile app
        try {
          window.location.replace(finalUrl);
        } catch {
          window.location.href = finalUrl;
        }
      }
    } catch (err: any) {
      console.error("Verification error:", err);
      let msg = err?.message || "Invalid verification code";
      if (err?.code === "auth/invalid-verification-code") {
        msg = "Incorrect 6-digit verification code. Please check your SMS.";
      } else if (err?.code === "auth/code-expired") {
        msg = "The code has expired. Please request a new one.";
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    if (digits.length === 6 && !loading) {
      void handleVerifyCode(undefined, digits);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-between selection:bg-red-500/20 selection:text-red-950">
      {/* Invisible ReCAPTCHA Container */}
      <div id="recaptcha-container"></div>

      {/* Top Header */}
      <header className="border-b border-slate-100 bg-white sticky top-0 z-30">
        <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-600 text-white font-bold flex items-center justify-center text-xs tracking-wider shadow-xs">
              SE
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-slate-900 leading-tight">
                SUGO EXPRESS
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">Phone Verification</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-600 text-xs font-medium">
            {step === "EXPIRED" ? (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span>Expired</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Secure</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Container - Card-free flat white canvas layout */}
      <main className="max-w-md mx-auto px-6 py-10 sm:py-16 flex-1 w-full flex flex-col justify-center">
        <div className="space-y-8">
          {/* Section Title & Subtitle */}
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {step === "PHONE" && "Verify your phone number"}
              {step === "CODE" && "Enter verification code"}
              {step === "SUCCESS" && "Phone verified!"}
              {step === "EXPIRED" && "Verification link expired"}
            </h2>

            {step === "PHONE" && (
              <p className="text-sm text-slate-600 leading-relaxed">
                Enter your mobile number to receive a 6-digit verification code via SMS.
              </p>
            )}

            {step === "CODE" && (
              <div className="flex flex-wrap items-center gap-x-1.5 text-sm text-slate-600 leading-relaxed">
                <span>We sent a 6-digit code to</span>
                <span className="font-semibold text-slate-900 font-mono">{phone}</span>
                <span className="text-slate-300">·</span>
                <button
                  type="button"
                  onClick={() => {
                    setStep("PHONE");
                    setCode("");
                    setErrorMessage(null);
                  }}
                  className="text-red-600 font-semibold hover:text-red-700 hover:underline cursor-pointer transition-colors"
                >
                  Edit number
                </button>
              </div>
            )}

            {step === "SUCCESS" && (
              <p className="text-sm text-slate-600 leading-relaxed">
                Your mobile number <span className="font-semibold text-slate-900 font-mono">{phone}</span> has been confirmed. Returning you to the app...
              </p>
            )}

            {step === "EXPIRED" && (
              <p className="text-sm text-slate-600 leading-relaxed">
                This single-use verification link was already completed and has expired for your security.
              </p>
            )}
          </div>

          {/* Feedback Banners */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <div className="leading-relaxed font-medium">{errorMessage}</div>
            </div>
          )}

          {statusMessage && !errorMessage && step !== "SUCCESS" && step !== "EXPIRED" && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs sm:text-sm flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0 text-blue-600" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Step 1: Phone Input Form */}
          {step === "PHONE" && (
            <form onSubmit={handleSendCode} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 block">
                  Mobile number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0917 123 4567 or +63 917 123 4567"
                    className="w-full pl-10 pr-4 py-3.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono text-base placeholder:text-slate-400 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/15 transition-all shadow-2xs"
                    disabled={loading}
                    autoFocus
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Standard telecom SMS rates may apply.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-5 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sending SMS code...</span>
                  </>
                ) : (
                  <>
                    <span>Send verification code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Step 2: 6-Digit Segmented Code Input Form */}
          {step === "CODE" && (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-center py-2">
                  <InputOTP
                    maxLength={6}
                    value={code}
                    onChange={handleCodeChange}
                    pattern={REGEXP_ONLY_DIGITS}
                    autoFocus
                  >
                    <InputOTPGroup className="gap-2 sm:gap-2.5">
                      <InputOTPSlot index={0} className="h-14 w-11 sm:w-12 text-xl font-bold font-mono rounded-xl border-slate-300 bg-slate-50/50 text-slate-900 shadow-2xs" activeClassName="z-10 border-red-600 ring-2 ring-red-600/20 bg-white" />
                      <InputOTPSlot index={1} className="h-14 w-11 sm:w-12 text-xl font-bold font-mono rounded-xl border-slate-300 bg-slate-50/50 text-slate-900 shadow-2xs" activeClassName="z-10 border-red-600 ring-2 ring-red-600/20 bg-white" />
                      <InputOTPSlot index={2} className="h-14 w-11 sm:w-12 text-xl font-bold font-mono rounded-xl border-slate-300 bg-slate-50/50 text-slate-900 shadow-2xs" activeClassName="z-10 border-red-600 ring-2 ring-red-600/20 bg-white" />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup className="gap-2 sm:gap-2.5">
                      <InputOTPSlot index={3} className="h-14 w-11 sm:w-12 text-xl font-bold font-mono rounded-xl border-slate-300 bg-slate-50/50 text-slate-900 shadow-2xs" activeClassName="z-10 border-red-600 ring-2 ring-red-600/20 bg-white" />
                      <InputOTPSlot index={4} className="h-14 w-11 sm:w-12 text-xl font-bold font-mono rounded-xl border-slate-300 bg-slate-50/50 text-slate-900 shadow-2xs" activeClassName="z-10 border-red-600 ring-2 ring-red-600/20 bg-white" />
                      <InputOTPSlot index={5} className="h-14 w-11 sm:w-12 text-xl font-bold font-mono rounded-xl border-slate-300 bg-slate-50/50 text-slate-900 shadow-2xs" activeClassName="z-10 border-red-600 ring-2 ring-red-600/20 bg-white" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {/* Resend Countdown or Interactive Link */}
                <div className="text-center text-sm text-slate-500 pt-1">
                  {resendCountdown > 0 ? (
                    <span className="inline-flex items-center gap-1.5 font-medium text-slate-500">
                      <span>Didn't receive the code? Resend in</span>
                      <span className="font-mono font-semibold tabular-nums text-slate-800">
                        {Math.floor(resendCountdown / 60)}:{String(resendCountdown % 60).padStart(2, "0")}
                      </span>
                    </span>
                  ) : (
                    <div className="inline-flex items-center gap-1.5">
                      <span>Didn't receive the code?</span>
                      <button
                        type="button"
                        onClick={handleSendCode}
                        disabled={loading}
                        className="text-red-600 font-semibold hover:text-red-700 hover:underline cursor-pointer transition-colors disabled:opacity-50"
                      >
                        Resend SMS
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full py-3.5 px-5 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying code...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Continue</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Step 3: Success Screen */}
          {step === "SUCCESS" && (
            <div className="space-y-6 text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <p className="text-base font-semibold text-slate-900">
                  Verified: <span className="font-mono">{phone}</span>
                </p>
                <p className="text-sm text-slate-600">
                  Your mobile number has been authenticated.
                </p>
              </div>

              {returnAppUrl ? (
                <div className="pt-2">
                  <a
                    href={returnAppUrl}
                    className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer shadow-xs"
                  >
                    <span>Return to Sugo Express App</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <p className="text-xs text-slate-500 mt-2.5">
                    If the app does not open automatically, tap the button above.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  You can now close this window and return to your application.
                </p>
              )}
            </div>
          )}

          {/* Step 4: Expired Link Security Screen */}
          {step === "EXPIRED" && (
            <div className="space-y-6 text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-7 h-7" />
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 space-y-2 text-left">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Single-use link status</span>
                  <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                    Expired upon completion
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  To protect your account, SMS verification links are single-use and expire immediately after authentication.
                </p>
              </div>

              <div className="pt-2 space-y-3">
                {redirectUrl ? (
                  <a
                    href={redirectUrl}
                    className="w-full py-3.5 px-5 bg-slate-900 hover:bg-slate-800 active:bg-black text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                  >
                    <span>Return to Sugo Express App</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        sessionStorage.removeItem("sugo_current_otp_session_expired");
                        if (rawPhone) {
                          const clean = formatToE164(rawPhone);
                          sessionStorage.removeItem(`sugo_otp_consumed_${clean}`);
                          localStorage.removeItem(`sugo_otp_consumed_${clean}`);
                        }
                      } catch {}
                      setStep("PHONE");
                      setCode("");
                      setErrorMessage(null);
                      setStatusMessage(null);
                    }}
                    className="w-full py-3.5 px-5 bg-slate-900 hover:bg-slate-800 active:bg-black text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                  >
                    <span>Start a new verification</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                {redirectUrl && (
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          sessionStorage.removeItem("sugo_current_otp_session_expired");
                          if (rawPhone) {
                            const clean = formatToE164(rawPhone);
                            sessionStorage.removeItem(`sugo_otp_consumed_${clean}`);
                            localStorage.removeItem(`sugo_otp_consumed_${clean}`);
                          }
                        } catch {}
                        setStep("PHONE");
                        setCode("");
                        setErrorMessage(null);
                        setStatusMessage(null);
                      }}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer transition-colors"
                    >
                      Need to verify again? Start new verification
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-6 text-center text-xs text-slate-400">
        <p>&copy; {new Date().getFullYear()} Sugo Express (Tacurong City). Secured with Google Firebase.</p>
      </footer>
    </div>
  );
};
