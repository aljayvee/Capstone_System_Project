import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import { auth } from "../firebase/config";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";
import {
  Phone,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Smartphone,
  ExternalLink,
} from "lucide-react";

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
  const [step, setStep] = useState<"PHONE" | "CODE" | "SUCCESS">("PHONE");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [returnAppUrl, setReturnAppUrl] = useState<string | null>(null);

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);

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

  const handleVerifyCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    const cleanCode = code.trim();
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
    setStatusMessage("Verifying code with Google Cloud...");

    try {
      const userCredential = await confirmationResultRef.current.confirm(cleanCode);
      const user = userCredential.user;
      const idToken = await user.getIdToken();
      const verifiedPhone = user.phoneNumber || phone;

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

  return (
    <div className="min-h-screen bg-[#0B132B] text-slate-100 flex flex-col justify-between selection:bg-red-500/30 selection:text-white">
      {/* Invisible ReCAPTCHA Container */}
      <div id="recaptcha-container"></div>

      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500 font-bold text-xs tracking-wider">
              SE
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-white leading-tight">
                SUGO EXPRESS
              </h1>
              <p className="text-[11px] text-slate-400">Phone Number Verification</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-slate-300 text-[11px] font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Secure</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-md mx-auto px-6 py-8 flex-1 w-full flex flex-col justify-center">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-7 space-y-6 shadow-xl">
          {/* Card Header */}
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-white tracking-tight">
              {step === "PHONE" && "Verify Your Phone"}
              {step === "CODE" && "Enter 6-Digit Code"}
              {step === "SUCCESS" && "Phone Verified!"}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              {step === "PHONE" &&
                "We will send a 6-digit text message to verify your phone number for Sugo Express orders."}
              {step === "CODE" &&
                `Enter the 6-digit verification code sent to ${phone}.`}
              {step === "SUCCESS" &&
                "Your mobile number has been authenticated. Returning you to the app..."}
            </p>
          </div>

          {/* Feedback Banners */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">{errorMessage}</div>
            </div>
          )}

          {statusMessage && !errorMessage && step !== "SUCCESS" && (
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Step 1: Phone Confirmation */}
          {step === "PHONE" && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+639171234567"
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700/80 rounded-xl text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                    disabled={loading}
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Standard telecom SMS rates may apply.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sending SMS...</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Step 2: Code Input */}
          {step === "CODE" && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 block">
                    6-Digit Code
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("PHONE");
                      setCode("");
                      setErrorMessage(null);
                    }}
                    className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    Change Number
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700/80 rounded-xl text-white font-mono text-lg tracking-widest placeholder:text-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                    disabled={loading}
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full py-3 px-4 bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Continue</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSendCode}
                disabled={loading}
                className="w-full py-2 text-xs font-medium text-slate-400 hover:text-white text-center cursor-pointer transition-colors"
              >
                Didn't receive the code? Resend SMS
              </button>
            </form>
          )}

          {/* Step 3: Success */}
          {step === "SUCCESS" && (
            <div className="space-y-4 text-center py-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">Verified: {phone}</p>
                <p className="text-xs text-slate-400">
                  Your phone number is confirmed.
                </p>
              </div>

              {returnAppUrl ? (
                <div className="pt-2">
                  <a
                    href={returnAppUrl}
                    className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer"
                  >
                    <span>Return to Sugo Express App</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <p className="text-[11px] text-slate-500 mt-2">
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
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-4 text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} Sugo Express (Tacurong City). Secured with Google Firebase.</p>
      </footer>
    </div>
  );
};
