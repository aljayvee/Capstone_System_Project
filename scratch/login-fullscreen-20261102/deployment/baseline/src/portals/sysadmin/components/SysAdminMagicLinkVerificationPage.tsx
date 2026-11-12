import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router";
import { CheckCircle2, AlertCircle, Shield, ArrowRight } from "lucide-react";
import { sysAdminApiService } from "../../../services/sysAdminApiService";
import { useOptionalSysAdminAuth } from "../context/SysAdminAuthContext";
import { BrandMark } from "../../../components/brand/BrandMark";

const SysAdminMagicLinkVerificationContent: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const auth = useOptionalSysAdminAuth();

  const [status, setStatus] = useState<"VERIFYING" | "SUCCESS" | "ERROR">("VERIFYING");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [adminName, setAdminName] = useState<string>("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("ERROR");
      setErrorMessage("No verification token found in URL.");
      return;
    }

    let isMounted = true;
    const verifyToken = async () => {
      try {
        const result = await sysAdminApiService.verifyMagicLink(token);
        if (isMounted) {
          if (auth?.applyVerifiedSession) {
            auth.applyVerifiedSession(result);
          }
          setAdminName(result.user.nickname || result.user.name || result.user.username);
          setStatus("SUCCESS");
        }
      } catch (err: any) {
        if (isMounted) {
          const msg =
            err?.response?.data?.error ||
            err?.message ||
            "Verification link has expired or is invalid. Please sign in again to receive a fresh link.";
          setErrorMessage(msg);
          setStatus("ERROR");
        }
      }
    };

    verifyToken();

    return () => {
      isMounted = false;
    };
  }, [searchParams, auth]);

  return (
    <div className="min-h-screen bg-board-ground text-ink flex flex-col justify-between select-none">
      <header className="px-6 py-4 border-b border-edge flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-signal flex items-center justify-center text-white">
            <BrandMark className="w-6" />
          </div>
          <div className="text-sm font-semibold tracking-wide text-ink flex items-center gap-2">
            SUGO EXPRESS
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-board-ground text-ink-muted border border-edge">
              IT Security
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-board-plate border border-edge rounded-xl shadow-2xl p-8 text-center">
          {status === "VERIFYING" && (
            <div className="py-6">
              <div className="w-12 h-12 border-3 border-status-act-ink/30 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h2 className="text-base font-semibold text-ink mb-1">Verifying Magic Link...</h2>
              <p className="text-xs text-ink-muted">Authenticating your System Administrator privileges</p>
            </div>
          )}

          {status === "SUCCESS" && (
            <div className="py-2">
              <div className="w-14 h-14 rounded-2xl bg-status-done-fill border border-status-done-ink/30 text-status-done-ink mx-auto flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <h2 className="text-lg font-bold text-ink mb-1">Email Verified Successfully!</h2>
              <p className="text-xs text-ink mb-6 leading-relaxed">
                Welcome, <span className="font-semibold text-ink">{adminName}</span>. Your administrator credentials and IT security access are fully activated.
              </p>

              <button
                type="button"
                onClick={() => navigate("/sysadmin", { replace: true })}
                className="w-full py-2.5 px-4 bg-signal hover:bg-signal-deep text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Shield className="w-4 h-4" />
                <span>Launch SysAdmin Console</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          )}

          {status === "ERROR" && (
            <div className="py-2">
              <div className="w-14 h-14 rounded-2xl bg-status-act-fill border border-status-act-ink/30 text-status-act-ink mx-auto flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>

              <h2 className="text-base font-bold text-ink mb-2">Verification Failed</h2>
              <p className="text-xs text-status-act-ink mb-6 leading-relaxed">{errorMessage}</p>

              <Link
                to="/sysadmin"
                replace
                className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-board-ground hover:bg-board-ground text-ink text-xs font-semibold rounded-lg transition-colors"
              >
                Return to SysAdmin Login
              </Link>
            </div>
          )}
        </div>
      </main>

      <footer className="px-6 py-3 border-t border-edge text-center text-[11px] text-ink-muted font-mono">
        SUGO Express &copy; {new Date().getFullYear()} &bull; System Security Verification Gateway
      </footer>
    </div>
  );
};

export const SysAdminMagicLinkVerificationPage: React.FC = () => {
  return <div data-surface="sysadmin"><SysAdminMagicLinkVerificationContent /></div>;
};

export default SysAdminMagicLinkVerificationPage;

