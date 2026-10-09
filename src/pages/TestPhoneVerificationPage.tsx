import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
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
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "../components/ui/input-otp";

export const TestPhoneVerificationPage: React.FC = () => {
  const [phone, setPhone] = useState("+639171234567");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"PHONE" | "CODE" | "SUCCESS" | "EXPIRED">("PHONE");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);

  // Check if session or phone has already expired from a previous successful verification
  useEffect(() => {
    const isCurrentSessionExpired = sessionStorage.getItem("sugo_test_otp_session_expired") === "true";
    const clean = phone.trim();
    let isPhoneExpired = false;
    if (clean) {
      try {
        const stored = sessionStorage.getItem(`sugo_test_otp_consumed_${clean}`);
        if (stored) {
          const parsed = JSON.parse(stored);
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
  }, []);

  // Resend countdown timer effect
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  // Clean up reCAPTCHA on unmount
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

    const cleanPhone = phone.trim();
    if (!cleanPhone.startsWith("+63") || cleanPhone.length !== 13) {
      setErrorMessage("Please enter a valid Philippine mobile number (e.g. +639171234567).");
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

      // 1. Invalidate & record immediate expiration for this test verification session
      const clean = phone.trim();
      try {
        sessionStorage.setItem(`sugo_test_otp_consumed_${clean}`, JSON.stringify({
          phone: clean,
          verifiedAt: Date.now(),
          status: "EXPIRED",
        }));
        sessionStorage.setItem("sugo_test_otp_session_expired", "true");
      } catch {
        // ignore
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
        console.warn("Test lab auth sign out:", e);
      }

      setVerificationResult({
        uid: user.uid,
        phoneNumber: user.phoneNumber,
        idToken,
        verifiedAt: new Date().toLocaleTimeString(),
      });
      setStep("SUCCESS");
      setStatusMessage("Phone number verified successfully!");
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-between selection:bg-red-500/20 selection:text-red-950">
      {/* Invisible ReCAPTCHA Container */}
      <div id="recaptcha-container"></div>

      {/* Top Header */}
      <header className="border-b border-slate-100 bg-white sticky top-0 z-30">
        <div className="max-w-xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-600 text-white font-bold flex items-center justify-center text-xs tracking-wider shadow-xs">
              SE
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-slate-900 leading-tight">
                SUGO EXPRESS
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">Live SMS Verification Lab</p>
            </div>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Portal</span>
          </Link>
        </div>
      </header>

      {/* Main Testing Console - Card-free flat white canvas layout */}
      <main className="max-w-xl mx-auto px-6 py-10 sm:py-16 flex-1 w-full flex flex-col justify-center">
        <div className="space-y-8">
          {/* Header Title */}
          <div className="space-y-2">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${
              step === "EXPIRED" 
                ? "bg-amber-50 border-amber-200 text-amber-700" 
                : "bg-red-50 border-red-200 text-red-700"
            }`}>
              {step === "EXPIRED" ? (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  <span>Session Expired Upon Verification</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-red-600" />
                  <span>Firebase Phone Auth Live Test</span>
                </>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {step === "PHONE" && "Verify your phone number"}
              {step === "CODE" && "Enter verification code"}
              {step === "SUCCESS" && "Phone verified successfully"}
              {step === "EXPIRED" && "Verification session expired"}
            </h2>
            {step === "PHONE" && (
              <p className="text-sm text-slate-600 leading-relaxed">
                Enter your Philippine mobile number to receive a live SMS verification code.
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
                Google Firebase has authenticated ownership of <span className="font-semibold text-slate-900 font-mono">{phone}</span> and minted an ID token.
              </p>
            )}
            {step === "EXPIRED" && (
              <p className="text-sm text-slate-600 leading-relaxed">
                This verification session completed and expired immediately for security. Replay attempts are blocked.
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

          {/* STEP 1: Phone Input Form */}
          {step === "PHONE" && (
            <form onSubmit={handleSendCode} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 block">
                  Mobile number (E.164 format)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+639XXXXXXXXX"
                    className="w-full pl-10 pr-4 py-3.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono text-base placeholder:text-slate-400 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/15 transition-all shadow-2xs"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div className="space-y-2">
                <span className="text-xs text-slate-500 font-medium block">Quick presets:</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setPhone("+639171234567")}
                    className="text-xs px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-mono transition-colors cursor-pointer"
                  >
                    +639171234567
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhone("+639181234567")}
                    className="text-xs px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-mono transition-colors cursor-pointer"
                  >
                    +639181234567
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sending SMS code...</span>
                  </>
                ) : (
                  <>
                    <span>Send verification SMS</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: 6-Digit Segmented Code Input Form */}
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

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep("PHONE");
                    setCode("");
                    setErrorMessage(null);
                  }}
                  disabled={loading}
                  className="w-1/3 py-3.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || code.trim().length !== 6}
                  className="w-2/3 py-3.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying code...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify code</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Success Screen */}
          {step === "SUCCESS" && verificationResult && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Phone Number Verified!</span>
                </div>
                <p className="text-slate-700 text-xs sm:text-sm">
                  Google Firebase successfully proved ownership of <strong>{verificationResult.phoneNumber}</strong>.
                </p>
                <div className="font-mono text-xs text-slate-600 pt-1 space-y-1">
                  <div><strong>Firebase UID:</strong> {verificationResult.uid}</div>
                  <div><strong>Verified At:</strong> {verificationResult.verifiedAt}</div>
                </div>
              </div>

              {/* ID Token Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span className="font-medium">Firebase ID Token (Proof for Backend)</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(verificationResult.idToken)}
                    className="text-red-600 hover:text-red-700 font-medium inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedToken ? "Copied" : "Copy token"}</span>
                  </button>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-700 break-all max-h-28 overflow-y-auto select-all">
                  {verificationResult.idToken}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setStep("PHONE");
                  setCode("");
                  setVerificationResult(null);
                  setErrorMessage(null);
                  setStatusMessage(null);
                }}
                className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Test another number
              </button>
            </div>
          )}

          {/* STEP 4: Expired Link Screen */}
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
                  SMS OTP verification links expire immediately once authentication succeeds. Replay or re-submission is prohibited.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  try {
                    sessionStorage.removeItem("sugo_test_otp_session_expired");
                    const clean = phone.trim();
                    sessionStorage.removeItem(`sugo_test_otp_consumed_${clean}`);
                  } catch {}
                  setStep("PHONE");
                  setCode("");
                  setVerificationResult(null);
                  setErrorMessage(null);
                  setStatusMessage(null);
                }}
                className="w-full py-3.5 px-5 bg-slate-900 hover:bg-slate-800 active:bg-black text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <span>Reset Expired State & Test Again</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-6 px-6 bg-white text-xs text-slate-400 text-center">
        <p>&copy; {new Date().getFullYear()} Sugo Express. Live Verification Lab.</p>
      </footer>
    </div>
  );
};

export default TestPhoneVerificationPage;
