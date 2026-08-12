import React, { useState } from "react";
import { useNavigate } from "react-router";
import {
  Eye, EyeOff, User, Lock, ChevronRight,
  Bike, AlertCircle, Loader2
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { UserRole, User as UserType } from "../types/auth";
import { apiService } from "../services/apiService";
import { MobileAppNoticeModal } from "./MobileAppNoticeModal";

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./ui/card";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mobileAppRoleAlert, setMobileAppRoleAlert] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError("Please enter your username and password.");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const response = await apiService.login(username.trim(), password.trim());

      if ("error" in response) {
        setError(response.error || "Unable to connect to authentication server.");
        setIsLoading(false);
        return;
      }

      const rawUser = response.user;
      const rawRole = (rawUser.role || "owner").toString().toLowerCase();

      // Check if role is Rider or Customer
      if (rawRole === "rider" || rawRole === "customer") {
        setIsLoading(false);
        setMobileAppRoleAlert(rawRole);
        return;
      }

      // Valid Web Portal user (Owner or Dispatcher)
      const userObj: UserType = {
        id: rawUser.id || Date.now(),
        username: rawUser.username || username.trim(),
        role: rawRole as UserRole,

        name: rawUser.name || rawUser.firstName || username.trim(),
        email: rawUser.email || `${username.trim()}@capstone.ph`,
        phone: rawUser.phone || "09170000000",
        avatar: (rawUser.username || username).substring(0, 2).toUpperCase(),
        token: response.token,
      };

      login(userObj, response.token);
      setIsLoading(false);
      navigate(`/${rawRole}`);
    } catch (err: any) {
      console.error("Login execution error:", err);
      setError(err.message || "An unexpected error occurred during login.");
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) handleLogin();
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #0F1F3D 0%, #1E3A5F 50%, #162D4A 100%)" }}
    >
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-3 mb-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: "#E53935" }}>
              <Bike className="text-white" size={28} />
            </div>
            <div className="text-left">
              <h1 className="text-white text-2xl font-black tracking-wide">SUGO SYSTEM PORTAL</h1>
              <p className="text-blue-300 text-xs font-semibold tracking-wider">TACURONG CITY LOGISTICS & DISPATCH</p>
            </div>
          </div>
        </div>

        <Card className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden border-slate-200">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-slate-800 font-bold text-xl">Sign In</CardTitle>
            <CardDescription className="text-slate-500 text-sm">Access your system portal workspace</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                <AlertCircle size={16} className="text-red-500 shrink-0" />
                <p className="text-red-600 text-sm font-medium">{error}</p>
              </div>
            )}

            <div>
              <label className="block mb-1.5 text-slate-700 text-sm font-medium">Username</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(""); }}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter username (e.g. owner, dispatcher)"
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-3 rounded-xl outline-none border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:border-indigo-500 disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="block mb-1.5 text-slate-700 text-sm font-medium">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter password"
                  disabled={isLoading}
                  className="w-full pl-10 pr-10 py-3 rounded-xl outline-none border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:border-indigo-500 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="pt-2 border-t-0 bg-transparent">
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full py-3 rounded-xl text-white flex items-center justify-center gap-2 bg-[#1E3A5F] hover:bg-[#162D4A] font-semibold text-sm transition-all shadow-md disabled:opacity-70 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span> <ChevronRight size={16} />
                </>
              )}
            </button>
          </CardFooter>
        </Card>
      </div>

      <MobileAppNoticeModal
        isOpen={!!mobileAppRoleAlert}
        roleName={mobileAppRoleAlert || ""}
        onClose={() => setMobileAppRoleAlert(null)}
      />
    </div>
  );
}
