import React, { useEffect, useId, useRef, useState } from "react";
import {
  ArrowLeft, Check, Circle, Eye, EyeOff, Loader2, Mail, RotateCw, Smartphone, UserRound,
} from "lucide-react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
  type ConfirmationResult,
} from "firebase/auth";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../ui/input-otp";
import { auth } from "../../firebase/config";
import { LoginAlertBanner } from "./LoginAlertBanner";
import {
  staffPasswordResetApi,
  type FoundAccount,
  type ResetChannel,
  type ResetFailure,
  isResetFailure,
} from "../../services/staffPasswordResetApi";

// Staff "forgot password", from finding the account to setting a new password.
//
//   FIND -> CHOOSE -> EMAIL_CODE ----------> NEW_PASSWORD -> onComplete
//                  -> SMS_NUMBER -> SMS_CODE
//
// The server holds every rule (staffPasswordResetService); this component holds
// only the drafts. Going back a step keeps what was typed, so a wrong turn never
// costs the person their input. The tokens live in state and die with the
// component, like the sign-in challenge token in LoginPage.

type Step = "FIND" | "CHOOSE" | "EMAIL_CODE" | "SMS_NUMBER" | "SMS_CODE" | "NEW_PASSWORD";

const SMS_RESEND_SECONDS = 60;

// The same five rules the server enforces (staffResetPassword in the API's
// authValidators). Spaces are refused there too, and reported separately below.
const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { id: "upper", label: "An uppercase letter (A to Z)", test: (v: string) => /[A-Z]/.test(v) },
  { id: "lower", label: "A lowercase letter (a to z)", test: (v: string) => /[a-z]/.test(v) },
  { id: "number", label: "A number (0 to 9)", test: (v: string) => /\d/.test(v) },
  { id: "special", label: "A special character, like ! @ # $", test: (v: string) => /[^A-Za-z0-9\s]/.test(v) },
];

function formatCountdown(msRemaining: number): string {
  const total = Math.max(0, Math.ceil(msRemaining / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

// Firebase texts Philippine mobiles only: +639XXXXXXXXX.
function toPhilippineE164(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  const local = digits.length >= 10 ? digits.slice(-10) : "";
  return /^9\d{9}$/.test(local) ? `+63${local}` : null;
}

const lastFour = (value: string | null | undefined) => (value || "").replace(/\D/g, "").slice(-4);

const inputClass =
  "w-full px-4 py-3 rounded-xl outline-none text-sm transition-colors duration-150 text-white placeholder-slate-400 caret-red-500 disabled:opacity-60 border border-slate-700 bg-slate-800 focus:border-red-500";
const labelClass = "text-slate-300 text-xs font-semibold uppercase tracking-wider";
const primaryButtonClass =
  "w-full py-3.5 rounded-xl text-white flex items-center justify-center gap-2 bg-[#DC2626] hover:bg-red-700 font-bold text-sm tracking-wide transition-colors disabled:opacity-50 disabled:hover:bg-[#DC2626] cursor-pointer disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B132B]";
const linkButtonClass =
  "inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer rounded px-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 disabled:opacity-50 disabled:cursor-not-allowed";

interface ForgotPasswordFlowProps {
  /** What the sign-in form held, when it was an email or a mobile number. */
  initialIdentifier?: string;
  onCancel: () => void;
  /** `email` is the address the account was found by, for prefilling sign-in. */
  onComplete: (email: string | null) => void;
}

interface FlowError {
  message: string;
  // A dead session cannot be retried in place; the only way on is to start over.
  restart: boolean;
}

export const ForgotPasswordFlow: React.FC<ForgotPasswordFlowProps> = ({
  initialIdentifier = "",
  onCancel,
  onComplete,
}) => {
  const ids = useId();
  const [step, setStep] = useState<Step>("FIND");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FlowError | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Step 1
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [honeypot, setHoneypot] = useState("");
  const [account, setAccount] = useState<FoundAccount | null>(null);

  // Step 2
  const [channel, setChannel] = useState<ResetChannel | null>(null);

  // Step 3, email
  const [emailCode, setEmailCode] = useState("");
  const [codeExpiresAt, setCodeExpiresAt] = useState(0);
  const [emailResendAt, setEmailResendAt] = useState(0);
  const [maskedEmailSentTo, setMaskedEmailSentTo] = useState<string | null>(null);

  // Step 3, SMS
  const [phoneInput, setPhoneInput] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [smsResendAt, setSmsResendAt] = useState(0);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  // Step 4
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const headingRef = useRef<HTMLHeadingElement>(null);

  // One 1 Hz tick drives every countdown on the screen.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // A step with a field to type in focuses it (autoFocus). A step without one
  // would otherwise leave focus on the body, since the button just pressed has
  // unmounted, so its heading takes focus instead and Tab continues from there.
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const active = document.activeElement;
    if (!active || active === document.body || !containerRef.current?.contains(active)) {
      headingRef.current?.focus();
    }
  }, [step]);

  // Fields and buttons are disabled while a request runs, and a disabled
  // element drops keyboard focus. When the request comes back refused, focus
  // returns to the step's first field so the next attempt starts where it is
  // typed, instead of from the top of the page.
  useEffect(() => {
    if (!error) return;
    const container = containerRef.current;
    const active = document.activeElement;
    if (active && active !== document.body && container?.contains(active)) return;
    const field = container?.querySelector<HTMLElement>(
      [
        'input[type="text"]:not([hidden]):not([tabindex="-1"]):not(:disabled)',
        'input[type="tel"]:not(:disabled)',
        'input[type="password"]:not(:disabled)',
        'input[type="radio"]:checked',
      ].join(", ")
    );
    (field ?? headingRef.current)?.focus();
  }, [error]);

  const clearRecaptcha = () => {
    try {
      recaptchaRef.current?.clear();
    } catch {
      // Already torn down.
    }
    recaptchaRef.current = null;
  };

  useEffect(() => () => clearRecaptcha(), []);

  const fail = (failure: ResetFailure | string) => {
    const message = typeof failure === "string" ? failure : failure.error;
    setError({ message, restart: /start again/i.test(message) });
  };

  const goTo = (next: Step) => {
    setError(null);
    setStep(next);
  };

  const startOver = () => {
    clearRecaptcha();
    confirmationRef.current = null;
    setAccount(null);
    setResetToken(null);
    setChannel(null);
    setEmailCode("");
    setSmsCode("");
    setNewPassword("");
    setConfirmPassword("");
    goTo("FIND");
  };

  // ── Step 1 ────────────────────────────────────────────────────────────────
  const handleFind = async () => {
    const value = identifier.trim();
    if (!value) {
      fail("Enter the email address or mobile number on your account.");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await staffPasswordResetApi.findAccount(value, honeypot);
    setBusy(false);
    if (isResetFailure(result)) {
      fail(result);
      return;
    }
    setAccount(result);
    // Keep an earlier choice if this account offers it; otherwise preselect
    // what it does offer, email first.
    setChannel((current) =>
      (current === "EMAIL" && result.maskedEmail) || (current === "SMS" && result.maskedPhone)
        ? current
        : result.maskedEmail
          ? "EMAIL"
          : result.maskedPhone
            ? "SMS"
            : null
    );
    // Searching by mobile number already proved they know it.
    if (!value.includes("@") && !phoneInput) setPhoneInput(value);
    goTo("CHOOSE");
  };

  // ── Step 2 ────────────────────────────────────────────────────────────────
  const sendEmailCode = async (): Promise<boolean> => {
    if (!account) return false;
    setBusy(true);
    setError(null);
    const result = await staffPasswordResetApi.sendCode(account.resetSessionToken, "EMAIL");
    setBusy(false);
    if (!isResetFailure(result) && result.channel === "EMAIL") {
      setMaskedEmailSentTo(result.maskedEmail);
      setCodeExpiresAt(Date.now() + result.expiresInSeconds * 1000);
      setEmailResendAt(Date.now() + result.resendAfterSeconds * 1000);
      setEmailCode("");
      return true;
    }
    if (isResetFailure(result) && result.status === 429 && result.retryAfterSeconds) {
      // A code went out moments ago and is still the live one: go and use it.
      setEmailResendAt(Date.now() + result.retryAfterSeconds * 1000);
      if (!codeExpiresAt) setCodeExpiresAt(Date.now() + 15 * 60 * 1000);
      return true;
    }
    if (isResetFailure(result)) fail(result);
    return false;
  };

  const handleContinueFromChoice = async () => {
    if (channel === "EMAIL") {
      if (await sendEmailCode()) goTo("EMAIL_CODE");
    } else if (channel === "SMS") {
      goTo("SMS_NUMBER");
    }
  };

  // ── Step 3, email ─────────────────────────────────────────────────────────
  const verifyEmail = async (code: string) => {
    if (!account || code.length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    const result = await staffPasswordResetApi.verifyEmailCode(account.resetSessionToken, code);
    setBusy(false);
    if (isResetFailure(result)) {
      setEmailCode("");
      fail(result);
      return;
    }
    setResetToken(result.resetToken);
    goTo("NEW_PASSWORD");
  };

  // ── Step 3, SMS ───────────────────────────────────────────────────────────
  const textCode = async (isResend: boolean) => {
    if (!account) return;
    const e164 = toPhilippineE164(phoneInput);
    if (!e164) {
      fail("Enter a Philippine mobile number, like 0917 123 4567.");
      return;
    }
    if (account.maskedPhone && lastFour(e164) !== lastFour(account.maskedPhone)) {
      fail(`That number does not end in ${lastFour(account.maskedPhone)}. Enter the number on your account.`);
      return;
    }

    setBusy(true);
    setError(null);
    // The server mails the account a "reset started" warning before any SMS
    // goes out. Once is enough: a resend does not mail it again.
    if (!isResend) {
      const notice = await staffPasswordResetApi.sendCode(account.resetSessionToken, "SMS");
      if (isResetFailure(notice)) {
        setBusy(false);
        fail(notice);
        return;
      }
    }
    try {
      clearRecaptcha();
      recaptchaRef.current = new RecaptchaVerifier(auth, `${ids}-recaptcha`, { size: "invisible" });
      confirmationRef.current = await signInWithPhoneNumber(auth, e164, recaptchaRef.current);
      setSmsCode("");
      setSmsResendAt(Date.now() + SMS_RESEND_SECONDS * 1000);
      if (!isResend) goTo("SMS_CODE");
    } catch (err: any) {
      clearRecaptcha();
      const code = err?.code as string | undefined;
      fail(
        code === "auth/quota-exceeded" || code === "auth/too-many-requests"
          ? "Too many text messages were sent. Please wait a while, or get a code by email."
          : code === "auth/invalid-phone-number"
            ? "That mobile number is not valid."
            : "We couldn't send the text message. Please try again, or get a code by email."
      );
    } finally {
      setBusy(false);
    }
  };

  const verifySms = async (code: string) => {
    if (!account || code.length !== 6 || busy) return;
    if (!confirmationRef.current) {
      fail("That text message expired. Send a new code.");
      return;
    }
    setBusy(true);
    setError(null);
    let idToken: string;
    try {
      const credential = await confirmationRef.current.confirm(code);
      idToken = await credential.user.getIdToken();
    } catch (err: any) {
      setBusy(false);
      setSmsCode("");
      fail(
        err?.code === "auth/code-expired"
          ? "That code expired. Send a new one."
          : "Incorrect code. Check the text message and try again."
      );
      return;
    }
    // The phone sign-in existed only to prove the number. Leaving it signed in
    // would leave a stray Firebase identity in this browser.
    await signOut(auth).catch(() => {});
    confirmationRef.current = null;
    clearRecaptcha();

    const result = await staffPasswordResetApi.verifySms(account.resetSessionToken, idToken);
    setBusy(false);
    if (isResetFailure(result)) {
      setSmsCode("");
      fail(result);
      return;
    }
    setResetToken(result.resetToken);
    goTo("NEW_PASSWORD");
  };

  // ── Step 4 ────────────────────────────────────────────────────────────────
  const ruleResults = PASSWORD_RULES.map((rule) => ({ ...rule, met: rule.test(newPassword) }));
  const hasSpace = /\s/.test(newPassword);
  const allRulesMet = ruleResults.every((rule) => rule.met) && !hasSpace;
  const passwordsMatch = confirmPassword.length > 0 && confirmPassword === newPassword;
  const canSave = allRulesMet && passwordsMatch && !busy;

  const handleSave = async () => {
    if (!resetToken || !canSave) return;
    setBusy(true);
    setError(null);
    const result = await staffPasswordResetApi.complete(resetToken, newPassword);
    setBusy(false);
    if (isResetFailure(result)) {
      fail(result);
      return;
    }
    const usedEmail = identifier.trim().includes("@") ? identifier.trim() : null;
    onComplete(usedEmail);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const headings: Record<Step, { title: string; description: React.ReactNode }> = {
    FIND: {
      title: "Find your account",
      description: "Enter the email address or mobile number on your portal account.",
    },
    CHOOSE: {
      title: "Is this your account?",
      description: "Choose where we should send your verification code.",
    },
    EMAIL_CODE: {
      title: "Check your email",
      description: (
        <>
          We sent a 6-digit code to <span className="font-semibold text-white">{maskedEmailSentTo || account?.maskedEmail}</span>.
        </>
      ),
    },
    SMS_NUMBER: {
      title: "Confirm your mobile number",
      description: (
        <>
          Enter the full number ending in <span className="font-semibold text-white font-mono">{lastFour(account?.maskedPhone)}</span>. We will text a code to it.
        </>
      ),
    },
    SMS_CODE: {
      title: "Check your phone",
      description: (
        <>
          We texted a 6-digit code to <span className="font-semibold text-white font-mono">{account?.maskedPhone}</span>.
        </>
      ),
    },
    NEW_PASSWORD: {
      title: "Create a new password",
      description: "Every device signed in to this account will be signed out.",
    },
  };

  const emailResendIn = Math.max(0, emailResendAt - now);
  const smsResendIn = Math.max(0, smsResendAt - now);
  const codeExpired = codeExpiresAt > 0 && now >= codeExpiresAt;
  const rulesId = `${ids}-rules`;

  return (
    <div ref={containerRef} className="space-y-5">
      {/* Invisible reCAPTCHA host for Firebase phone sign-in */}
      <div id={`${ids}-recaptcha`} />

      <div className="space-y-1.5">
        <h2 ref={headingRef} tabIndex={-1} className="text-white text-lg font-bold tracking-tight outline-none">
          {headings[step].title}
        </h2>
        <p className="text-slate-400 text-sm leading-relaxed">{headings[step].description}</p>
      </div>

      {error && (
        <LoginAlertBanner
          variant="error"
          title={error.restart ? "Please start again" : "Something needs attention"}
          message={error.message}
          actionText={error.restart ? "Start again" : undefined}
          onAction={error.restart ? startOver : undefined}
          onDismiss={() => setError(null)}
        />
      )}

      {/* STEP 1: FIND */}
      {step === "FIND" && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleFind();
          }}
        >
          <div>
            <label htmlFor={`${ids}-identifier`} className={`${labelClass} block mb-1.5`}>
              Email or mobile number
            </label>
            <input
              id={`${ids}-identifier`}
              type="text"
              inputMode="email"
              autoComplete="username"
              autoFocus
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (error) setError(null);
              }}
              placeholder="name@example.com or 0917 123 4567"
              disabled={busy}
              className={inputClass}
            />
          </div>
          {/* Honeypot: hidden from people and from the keyboard, filled only by bots */}
          <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
            <label htmlFor={`${ids}-website`}>Website</label>
            <input
              id={`${ids}-website`}
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>
          <button type="submit" disabled={busy} className={primaryButtonClass}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
            <span>{busy ? "Searching..." : "Find my account"}</span>
          </button>
          <div>
            <button type="button" onClick={onCancel} className={linkButtonClass}>
              <ArrowLeft size={13} />
              Back to sign in
            </button>
          </div>
        </form>
      )}

      {/* STEP 2: CHOOSE */}
      {step === "CHOOSE" && account && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-800/80 border border-slate-700">
            <div className="shrink-0 w-11 h-11 rounded-lg bg-slate-700/70 flex items-center justify-center text-slate-200">
              <UserRound size={22} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-white text-base font-bold leading-snug break-words">{account.fullName}</p>
              <p className="text-slate-400 text-xs mt-0.5">Sugo On the Go portal account</p>
            </div>
          </div>

          {account.maskedEmail || account.maskedPhone ? (
            <fieldset className="space-y-2.5">
              <legend className={`${labelClass} mb-2`}>Send my code by</legend>
              {account.maskedEmail && (
                <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-700 bg-slate-800 cursor-pointer transition-colors hover:border-slate-500 has-[:checked]:border-red-500 has-[:checked]:bg-red-500/10 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-red-500">
                  <input
                    type="radio"
                    name={`${ids}-channel`}
                    value="EMAIL"
                    checked={channel === "EMAIL"}
                    onChange={() => setChannel("EMAIL")}
                    className="sr-only"
                  />
                  <Mail size={18} className="shrink-0 text-slate-300" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-white">Email</span>
                    <span className="block text-xs text-slate-400 break-all">{account.maskedEmail}</span>
                  </span>
                  <span className="ml-auto shrink-0 w-4 h-4 rounded-full border border-slate-500 flex items-center justify-center" aria-hidden="true">
                    {channel === "EMAIL" && <span className="w-2 h-2 rounded-full bg-red-500" />}
                  </span>
                </label>
              )}
              {account.maskedPhone && (
                <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-700 bg-slate-800 cursor-pointer transition-colors hover:border-slate-500 has-[:checked]:border-red-500 has-[:checked]:bg-red-500/10 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-red-500">
                  <input
                    type="radio"
                    name={`${ids}-channel`}
                    value="SMS"
                    checked={channel === "SMS"}
                    onChange={() => setChannel("SMS")}
                    className="sr-only"
                  />
                  <Smartphone size={18} className="shrink-0 text-slate-300" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-white">Text message</span>
                    <span className="block text-xs text-slate-400 font-mono">{account.maskedPhone}</span>
                  </span>
                  <span className="ml-auto shrink-0 w-4 h-4 rounded-full border border-slate-500 flex items-center justify-center" aria-hidden="true">
                    {channel === "SMS" && <span className="w-2 h-2 rounded-full bg-red-500" />}
                  </span>
                </label>
              )}
              <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                We also email this account to let you know a password reset was started.
              </p>
            </fieldset>
          ) : (
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10">
              <p className="text-sm font-semibold text-amber-200">No verified email or mobile number</p>
              <p className="text-xs text-amber-200/90 mt-1 leading-relaxed">
                We can only send a code to an email address or mobile number this account has verified. Ask the
                owner to reset your password from the Users page.
              </p>
            </div>
          )}

          {(account.maskedEmail || account.maskedPhone) && (
            <button
              type="button"
              onClick={() => void handleContinueFromChoice()}
              disabled={busy || !channel}
              className={primaryButtonClass}
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>{busy ? "Sending..." : channel === "SMS" ? "Continue" : "Send code"}</span>
            </button>
          )}

          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={() => goTo("FIND")} disabled={busy} className={linkButtonClass}>
              <ArrowLeft size={13} />
              Not you? Search again
            </button>
            <button type="button" onClick={onCancel} disabled={busy} className={linkButtonClass}>
              Back to sign in
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: EMAIL CODE */}
      {step === "EMAIL_CODE" && (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3">
            <InputOTP
              maxLength={6}
              pattern={REGEXP_ONLY_DIGITS}
              value={emailCode}
              onChange={(value) => {
                // Ignored rather than disabled while a check runs: a disabled
                // field loses keyboard focus, and a wrong code should leave the
                // cursor right where the next attempt is typed.
                if (busy) return;
                setEmailCode(value);
                if (error) setError(null);
                if (value.length === 6) void verifyEmail(value);
              }}
              disabled={codeExpired}
              autoFocus
              aria-label="6-digit code from the email"
            >
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <InputOTPSlot key={index} index={index} className="border-slate-700 bg-slate-800 text-white" />
                ))}
              </InputOTPGroup>
            </InputOTP>
            <p className="text-[11px] text-slate-400 font-medium" aria-live="polite">
              {codeExpired ? (
                "This code expired. Send a new one."
              ) : (
                <>
                  The code expires in{" "}
                  <span className="font-mono tabular-nums text-slate-300 font-semibold">
                    {formatCountdown(codeExpiresAt - now)}
                  </span>
                </>
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void verifyEmail(emailCode)}
            disabled={emailCode.length !== 6 || busy || codeExpired}
            className={primaryButtonClass}
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
            <span>{busy ? "Checking..." : "Verify code"}</span>
          </button>

          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={() => goTo("CHOOSE")} disabled={busy} className={linkButtonClass}>
              <ArrowLeft size={13} />
              Use a different method
            </button>
            <button
              type="button"
              onClick={() => void sendEmailCode()}
              disabled={busy || emailResendIn > 0}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 transition-colors disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer rounded px-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400"
            >
              <RotateCw size={13} />
              <span className="font-mono tabular-nums">
                {emailResendIn > 0 ? `Resend in ${formatCountdown(emailResendIn)}` : "Resend code"}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: SMS NUMBER */}
      {step === "SMS_NUMBER" && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void textCode(false);
          }}
        >
          <div>
            <label htmlFor={`${ids}-phone`} className={`${labelClass} block mb-1.5`}>
              Mobile number
            </label>
            <input
              id={`${ids}-phone`}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              autoFocus
              value={phoneInput}
              onChange={(e) => {
                setPhoneInput(e.target.value);
                if (error) setError(null);
              }}
              placeholder="0917 123 4567"
              disabled={busy}
              className={`${inputClass} font-mono tracking-wide`}
            />
          </div>
          <button type="submit" disabled={busy || !phoneInput.trim()} className={primaryButtonClass}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
            <span>{busy ? "Sending..." : "Text me a code"}</span>
          </button>
          <div>
            <button type="button" onClick={() => goTo("CHOOSE")} disabled={busy} className={linkButtonClass}>
              <ArrowLeft size={13} />
              Use a different method
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: SMS CODE */}
      {step === "SMS_CODE" && (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3">
            <InputOTP
              maxLength={6}
              pattern={REGEXP_ONLY_DIGITS}
              value={smsCode}
              onChange={(value) => {
                if (busy) return;
                setSmsCode(value);
                if (error) setError(null);
                if (value.length === 6) void verifySms(value);
              }}
              autoFocus
              aria-label="6-digit code from the text message"
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
            onClick={() => void verifySms(smsCode)}
            disabled={smsCode.length !== 6 || busy}
            className={primaryButtonClass}
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
            <span>{busy ? "Checking..." : "Verify code"}</span>
          </button>

          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={() => goTo("SMS_NUMBER")} disabled={busy} className={linkButtonClass}>
              <ArrowLeft size={13} />
              Change number
            </button>
            <button
              type="button"
              onClick={() => void textCode(true)}
              disabled={busy || smsResendIn > 0}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 transition-colors disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer rounded px-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400"
            >
              <RotateCw size={13} />
              <span className="font-mono tabular-nums">
                {smsResendIn > 0 ? `Resend in ${formatCountdown(smsResendIn)}` : "Resend code"}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: NEW PASSWORD */}
      {step === "NEW_PASSWORD" && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave();
          }}
        >
          {/* Lets password managers file the new password under the right account */}
          <input type="text" name="username" autoComplete="username" value={identifier.trim()} readOnly hidden />

          <div>
            <label htmlFor={`${ids}-new-password`} className={`${labelClass} block mb-1.5`}>
              New password
            </label>
            <div className="relative">
              <input
                id={`${ids}-new-password`}
                type={showNewPassword ? "text" : "password"}
                autoComplete="new-password"
                autoFocus
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (error) setError(null);
                }}
                aria-describedby={rulesId}
                aria-invalid={newPassword.length > 0 && !allRulesMet}
                disabled={busy}
                className={`${inputClass} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((v) => !v)}
                aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                aria-pressed={showNewPassword}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <ul id={rulesId} className="grid gap-1.5 p-3 rounded-xl bg-slate-800/60 border border-slate-700/80">
            {ruleResults.map((rule) => (
              <li
                key={rule.id}
                className={`flex items-center gap-2 text-xs transition-colors ${rule.met ? "text-emerald-300" : "text-slate-400"}`}
              >
                {rule.met ? (
                  <Check size={14} strokeWidth={3} className="shrink-0" aria-hidden="true" />
                ) : (
                  <Circle size={14} className="shrink-0" aria-hidden="true" />
                )}
                <span>
                  {rule.label}
                  <span className="sr-only">{rule.met ? " (met)" : " (not met yet)"}</span>
                </span>
              </li>
            ))}
            {hasSpace && (
              <li className="flex items-center gap-2 text-xs text-rose-300">
                <Circle size={14} className="shrink-0" aria-hidden="true" />
                <span>Remove the spaces. Passwords cannot contain spaces.</span>
              </li>
            )}
          </ul>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor={`${ids}-confirm-password`} className={labelClass}>
                Confirm new password
              </label>
              {confirmPassword.length > 0 && (
                <span
                  className={`text-[11px] font-medium ${passwordsMatch ? "text-emerald-300" : "text-rose-300"}`}
                  aria-live="polite"
                >
                  {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                </span>
              )}
            </div>
            <div className="relative">
              <input
                id={`${ids}-confirm-password`}
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                aria-invalid={confirmPassword.length > 0 && !passwordsMatch}
                disabled={busy}
                className={`${inputClass} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                aria-label={showConfirmPassword ? "Hide confirmed password" : "Show confirmed password"}
                aria-pressed={showConfirmPassword}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={!canSave} className={primaryButtonClass}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
            <span>{busy ? "Saving..." : "Save new password"}</span>
          </button>

          <div>
            <button type="button" onClick={onCancel} disabled={busy} className={linkButtonClass}>
              Cancel and back to sign in
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ForgotPasswordFlow;
