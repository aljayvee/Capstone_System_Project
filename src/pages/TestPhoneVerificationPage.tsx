import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
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
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";

export const TestPhoneVerificationPage: React.FC = () => {
  const [phone, setPhone] = useState("+639171234567");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"PHONE" | "CODE" | "SUCCESS">("PHONE");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);

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
        setStatusMessage("reCAPTCHA verified. Sending SMS...");
      },
      "expired-callback": () => {
        setErrorMessage("reCAPTCHA expired. Please try again.");
        setLoading(false);
      },
    });
  };

  const handleSendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    const cleanPhone = phone.trim();
    if (!cleanPhone.startsWith("+") || cleanPhone.length < 11) {
      setErrorMessage("Please enter a valid phone number in international format (e.g. +639171234567).");
      return;
    }

    setLoading(true);
    setStatusMessage("Initializing Google security check...");

    try {
      initRecaptcha();
      if (!recaptchaVerifierRef.current) {
        throw new Error("Failed to initialize reCAPTCHA verifier");
      }

      setStatusMessage("Dispatching SMS request to Google Firebase...");
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        cleanPhone,
        recaptchaVerifierRef.current
      );

      confirmationResultRef.current = confirmationResult;
      setStatusMessage("SMS text message dispatched to your phone!");
      setStep("CODE");
    } catch (err: any) {
      console.error("Firebase Phone Auth error:", err);
      let msg = err?.message || "Failed to send verification SMS";
      if (err?.code === "auth/invalid-phone-number") {
        msg = "Invalid phone number format. Must be +63 followed by 10 digits.";
      } else if (err?.code === "auth/quota-exceeded") {
        msg = "SMS quota exceeded for today. Please wait or check Firebase billing.";
      } else if (err?.code === "auth/unauthorized-domain") {
        msg = "Domain not authorized in Firebase Console. Please add portal.sugo-express.org to Authentication > Settings > Authorized domains.";
      } else if (err?.code === "auth/missing-client-identifier") {
        msg = "Google blocked the request: Missing client verification identifier.";
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
      setErrorMessage("Please enter the 6-digit code sent to your phone.");
      return;
    }

    if (!confirmationResultRef.current) {
      setErrorMessage("No active verification session. Please request a new code.");
      setStep("PHONE");
      return;
    }

    setLoading(true);
    setStatusMessage("Verifying code with Google Firebase...");

    try {
      const userCredential = await confirmationResultRef.current.confirm(cleanCode);
      const user = userCredential.user;
      const idToken = await user.getIdToken();

      setVerificationResult({
        uid: user.uid,
        phoneNumber: user.phoneNumber,
        idToken,
        verifiedAt: new Date().toLocaleTimeString(),
      });
      setStep("SUCCESS");
      setStatusMessage("Verification successful!");
    } catch (err: any) {
      console.error("Verification error:", err);
      let msg = err?.message || "Invalid verification code";
      if (err?.code === "auth/invalid-verification-code") {
        msg = "Incorrect 6-digit code. Please check your SMS and try again.";
      } else if (err?.code === "auth/code-expired") {
        msg = "The verification code has expired. Please request a new one.";
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-red-500/30 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500 font-bold text-sm">
              SE
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-white leading-tight">
                SUGO EXPRESS
              </h1>
              <p className="text-xs text-slate-400">Live SMS Verification Lab</p>
            </div>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 px-3 py-1.5 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Portal</span>
          </Link>
        </div>
      </header>

      {/* Main Testing Console */}
      <main className="max-w-xl mx-auto px-6 py-10 flex-1 w-full flex flex-col justify-center">
        {/* Invisible ReCAPTCHA Container */}
        <div id="recaptcha-container"></div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
          {/* Card Title */}
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Firebase Phone Auth Live Test</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {step === "PHONE" && "Send Verification SMS"}
              {step === "CODE" && "Enter 6-Digit SMS Code"}
              {step === "SUCCESS" && "Phone Verified Successfully"}
            </h2>
            <p className="text-xs text-slate-400">
              {step === "PHONE" && "Enter your Philippine mobile number to receive a live verification code."}
              {step === "CODE" && `Enter the 6-digit code received via SMS on ${phone}.`}
              {step === "SUCCESS" && "Google Firebase has confirmed device ownership and minted a verified token."}
            </p>
          </div>

          {/* Status / Error Banners */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">{errorMessage}</div>
            </div>
          )}

          {statusMessage && !errorMessage && (
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* STEP 1: Phone Input Form */}
          {step === "PHONE" && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  Mobile Number (E.164 Format)
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
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700/80 rounded-xl text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-500 font-medium block">Quick presets:</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setPhone("+639171234567")}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors font-mono"
                  >
                    +639171234567
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhone("+639181234567")}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors font-mono"
                  >
                    +639181234567
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Contacting Google...</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification SMS</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: Code Input Form */}
          {step === "CODE" && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  6-Digit SMS Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  autoFocus
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700/80 rounded-xl text-white font-mono text-xl tracking-widest text-center placeholder:text-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                  disabled={loading}
                />
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
                  className="w-1/3 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || code.trim().length !== 6}
                  className="w-2/3 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify Code</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={loading}
                  className="text-xs text-red-400 hover:underline cursor-pointer"
                >
                  Didn't receive SMS? Resend Code
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Success Screen */}
          {step === "SUCCESS" && verificationResult && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-300 text-xs space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-green-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Phone Number Verified!</span>
                </div>
                <p className="text-slate-300 text-xs">
                  Google Firebase successfully proved ownership of <strong>{verificationResult.phoneNumber}</strong>.
                </p>
                <div className="font-mono text-[11px] text-slate-400 pt-1 space-y-1">
                  <div><strong>Firebase UID:</strong> {verificationResult.uid}</div>
                  <div><strong>Verified At:</strong> {verificationResult.verifiedAt}</div>
                </div>
              </div>

              {/* ID Token Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Firebase ID Token (Proof for Backend)</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(verificationResult.idToken)}
                    className="text-red-400 hover:text-red-300 inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copiedToken ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedToken ? "Copied" : "Copy Token"}</span>
                  </button>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[10px] text-slate-400 break-all max-h-24 overflow-y-auto">
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
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors cursor-pointer"
              >
                Test Another Number
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 px-6 bg-slate-950 text-xs text-slate-500 text-center">
        <p>&copy; 2026 Sugo Express. Live Verification Lab.</p>
      </footer>
    </div>
  );
};

export default TestPhoneVerificationPage;
