import React from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "../context/AuthContext";
import { ArrowLeft, Home, MapPin, AlertTriangle } from "lucide-react";

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // Role-aware home destination
  const getHomeRoute = () => {
    if (!isAuthenticated || !user) return "/";
    if (user.role === "owner") return "/owner";
    if (user.role === "dispatcher") return "/dispatcher";
    return "/";
  };

  return (
    <div className="min-h-screen w-full bg-white text-slate-900 flex items-center justify-center p-5 font-sans select-none">
      
      {/* High-Performance Minimalist White Card Container */}
      <div className="max-w-md w-full text-center bg-white border border-slate-200 p-8 rounded-3xl shadow-xl shadow-slate-100 space-y-6">
        
        {/* Traffic Alert Badge */}
        <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full text-amber-700 text-[11px] font-bold tracking-wider uppercase">
          <AlertTriangle size={13} className="text-amber-600" />
          <span>Status: 404 Route Lost</span>
        </div>

        {/* Delivery Scooter Badge */}
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center relative shadow-xs">
            <span className="text-4xl">🛵</span>
            <div className="absolute -top-2 -right-2 bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs">
              OFF ROUTE
            </div>
          </div>
        </div>

        {/* Hero 404 & Silly Copy */}
        <div className="space-y-2">
          <h1 className="text-7xl font-black tracking-tight text-slate-900">
            4<span className="text-blue-600">0</span>4
          </h1>

          <h2 className="text-xl font-bold text-slate-800 flex items-center justify-center gap-2">
            <MapPin size={18} className="text-blue-600" />
            <span>Route Not Found</span>
          </h2>

          <p className="text-slate-600 text-xs leading-relaxed max-w-sm mx-auto font-medium pt-1">
            Whoops! Our delivery rider took a wrong turn at the roundabout and ended up in Narnia. 🧭📍
          </p>

          <p className="text-slate-500 text-[11px] italic">
            Even GPS is scratching its head right now. Let's get you back on track before your food gets cold! 🍟
          </p>
        </div>

        {/* Navigation Action Buttons */}
        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-bold py-3 px-4 rounded-xl text-xs border border-slate-300 transition active:scale-95 shadow-xs cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Go Back</span>
          </button>

          <Link
            to={getHomeRoute()}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition active:scale-95 shadow-md shadow-blue-600/20 cursor-pointer"
          >
            <Home size={14} />
            <span>Return Home</span>
          </Link>
        </div>

      </div>
    </div>
  );
};

export default NotFoundPage;
