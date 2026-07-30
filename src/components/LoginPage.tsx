import React, { useState } from "react";
import { useNavigate } from "react-router";
import {
  Eye, EyeOff, User, Lock, ChevronRight,
  Bike, AlertCircle
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { UserRole } from "../types/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = () => {
    if (!username.trim() || !password.trim()) {
      setError("Please enter your username and password.");
      return;
    }

    const trimmedUser = username.trim().toLowerCase();
    let detectedRole: UserRole = "owner";
    if (trimmedUser.includes("dispatch")) {
      detectedRole = "dispatcher";
    } else if (trimmedUser.includes("rider")) {
      detectedRole = "rider";
    }

    const userObj = {
      id: Date.now(),
      username: username.trim(),
      role: detectedRole,
      name: username.charAt(0).toUpperCase() + username.slice(1),
      email: `${username.trim()}@capstone.ph`,
      phone: "09170000000",
      avatar: username.substring(0, 2).toUpperCase(),
    };

    setError("");
    login(userObj);
    navigate(`/${detectedRole}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
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
              <h1 className="text-white text-2xl font-black tracking-wide">ERRAND SYSTEM</h1>
              <p className="text-blue-300 text-xs font-semibold tracking-wider">MARIADB BACKEND SYSTEM</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden p-8">
          <h2 className="text-center mb-1 text-slate-800 font-bold text-xl">Sign In</h2>
          <p className="text-center mb-6 text-slate-500 text-sm">Access your system portal workspace</p>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl mb-4 bg-red-50 border border-red-200">
              <AlertCircle size={16} className="text-red-500" />
              <p className="text-red-600 text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="space-y-4">
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
                  className="w-full pl-10 pr-4 py-3 rounded-xl outline-none border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:border-indigo-500"
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
                  className="w-full pl-10 pr-10 py-3 rounded-xl outline-none border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:border-indigo-500"
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

            <button
              onClick={handleLogin}
              className="w-full py-3 rounded-xl text-white flex items-center justify-center gap-2 bg-[#1E3A5F] hover:bg-[#162D4A] font-semibold text-sm transition-all shadow-md mt-2"
            >
              Sign In <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
