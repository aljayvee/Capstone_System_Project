import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router";
import { useAuth } from "../context/AuthContext";
import { ArrowLeft, Home } from "lucide-react";

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  const [rayId, setRayId] = useState("");
  const [showIp, setShowIp] = useState(false);
  const [timestamp, setTimestamp] = useState("");

  const role = (user?.role || "").toLowerCase();

  useEffect(() => {
    // Generate pseudo Ray ID matching Cloudflare format
    const randomRay = Math.random().toString(16).substring(2, 10) + Math.random().toString(16).substring(2, 10);
    setRayId(randomRay);

    const now = new Date();
    const utcStr = now.toISOString().replace("T", " ").substring(0, 19) + " UTC";
    setTimestamp(utcStr);
  }, []);

  const getHomeRoute = () => {
    if (!isAuthenticated || !user) return "/";
    if (role === "owner") return "/owner";
    if (role === "dispatcher") return "/dispatcher";
    return "/";
  };

  return (
    <div className="min-h-screen w-full bg-white text-[#404040] font-sans text-base antialiased select-none flex flex-col justify-between">
      
      {/* MAIN CONTAINER */}
      <div className="w-full max-w-[960px] mx-auto px-6 sm:px-8 pt-10 sm:pt-14 pb-12 flex-1">
        
        {/* HEADER SECTION */}
        <header className="mb-8 sm:mb-10 text-left">
          <h1 className="text-4xl sm:text-6xl font-light text-[#404040] leading-tight flex flex-wrap items-center gap-3">
            <span>Not Found</span>
            <span className="bg-[#d9d9d9] text-[#313131] font-medium rounded-full text-xs px-3 py-1 sm:text-sm sm:px-3.5 sm:py-1 tracking-normal">
              Error code 404
            </span>
          </h1>
          <div className="mt-3 text-xs sm:text-sm text-[#737373] font-mono">
            {timestamp}
          </div>
        </header>

        {/* 3-TIER DIAGNOSTIC PIPELINE STRIP */}
        <div className="my-8 bg-gradient-to-b from-[#dedede] via-[#ebebeb] to-[#dedede] rounded-xl p-0.5 shadow-xs overflow-hidden">
          <div className="bg-[#fcfcfc] rounded-[10px] grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#dedede]">
            
            {/* NODE 1: YOU / BROWSER (ERROR) */}
            <div className="relative p-8 md:py-12 text-center flex flex-col items-center justify-center">
              <div className="relative mb-6">
                {/* Browser SVG */}
                <svg className="w-20 h-16 text-[#999]" viewBox="0 0 100 80.7" fill="currentColor">
                  <path d="M89.8.2H10.2C4.6.2.2 4.6.2 10.2v60.4c0 5.5 4.5 10 10 10h79.7c5.5 0 10-4.5 10-10V10.2c0-5.5-4.5-10-10-10ZM22.8 9.6c2 0 3.6 1.6 3.6 3.6s-1.6 3.6-3.6 3.6-3.6-1.6-3.6-3.6 1.6-3.6 3.6-3.6ZM12.9 9.6c2 0 3.6 1.6 3.6 3.6s-1.6 3.6-3.6 3.6-3.6-1.6-3.6-3.6 1.6-3.6 3.6-3.6ZM89.8 70.1H9.7V24.2h80.1v45.9ZM89.8 16.2H29.9v-6h59.9v6Z" />
                </svg>
                {/* Error Cross Badge */}
                <div className="absolute -bottom-3 -right-3 w-10 h-10 rounded-full bg-[#bd2426] flex items-center justify-center shadow-md border-2 border-white">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </div>
              </div>
              <span className="text-sm text-[#737373] block mb-1">You</span>
              <h3 className="text-2xl text-[#666] font-light leading-snug">Page</h3>
              <span className="text-2xl font-normal text-[#bd2426]">Error</span>
            </div>

            {/* NODE 2: CLOUD (WORKING) */}
            <div className="relative p-8 md:py-12 text-center flex flex-col items-center justify-center">
              <div className="relative mb-6">
                {/* Cloud SVG */}
                <svg className="w-24 h-16 text-[#999]" viewBox="0 0 152 78.9" fill="currentColor">
                  <path d="M132.3 78v-.03c10.5-.24 19-8.88 19-19.52 0-10.79-8.72-19.54-19.47-19.54-2.9 0-5.65.66-8.12 1.8C123.33 18.66 105.34.92 83.2.92c-17.83 0-32.95 11.5-38.39 27.49-3.03-2.28-6.78-3.64-10.86-3.64-10.01 0-18.12 8.11-18.12 18.12 0 1.73.26 3.4.71 4.99-.29-.02-.58-.04-.87-.04-8.28 0-14.99 6.75-14.99 15.08 0 8.28 6.64 14.99 14.85 15.07v.01h.11c.01 0 .02 0 .03 0s.02 0 .03 0" />
                </svg>
                {/* Success Check Badge */}
                <div className="absolute -bottom-3 -right-3 w-10 h-10 rounded-full bg-[#9bca3e] flex items-center justify-center shadow-md border-2 border-white">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              </div>
              <span className="text-sm text-[#737373] block mb-1">Cloud</span>
              <h3 className="text-2xl text-[#666] font-light leading-snug">Server</h3>
              <span className="text-2xl font-normal text-[#9bca3e]">Working</span>
            </div>

            {/* NODE 3: HOST / WEBSITE (WORKING) */}
            <div className="relative p-8 md:py-12 text-center flex flex-col items-center justify-center">
              <div className="relative mb-6">
                {/* Server SVG */}
                <svg className="w-20 h-16 text-[#999]" viewBox="0 0 95 75" fill="currentColor">
                  <path d="M94 45.1L81 6.6C79.7 2.8 76.2.2 72.2.2L22.3.2C18.3.2 14.7 2.7 13.5 6.5L1 42.8c-.3 1-.5 2-.5 3l-.01 19.6C.48 70.6 4.67 74.8 9.83 74.8h75.3c5.16 0 9.35-4.19 9.35-9.35V48.1c0-1-.17-2-.48-3ZM86.8 65.3c0 1.29-1.05 2.34-2.34 2.34H10c-1.29 0-2.34-1.05-2.34-2.34V47.2c0-1.29 1.05-2.34 2.34-2.34h74.5c1.29 0 2.34 1.05 2.34 2.34v18.1Z" />
                  <circle cx="74.6" cy="56.2" r="4.7" />
                  <circle cx="59.1" cy="56.2" r="4.7" />
                </svg>
                {/* Success Check Badge */}
                <div className="absolute -bottom-3 -right-3 w-10 h-10 rounded-full bg-[#9bca3e] flex items-center justify-center shadow-md border-2 border-white">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              </div>
              <span className="text-sm text-[#737373] block mb-1">Website</span>
              <h3 className="text-2xl text-[#666] font-light leading-snug">Host</h3>
              <span className="text-2xl font-normal text-[#9bca3e]">Working</span>
            </div>

          </div>
        </div>

        {/* DETAILS SECTION (2-COLUMN WHAT HAPPENED / WHAT CAN I DO) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-10 text-left">
          
          {/* COLUMN 1: WHAT HAPPENED */}
          <div className="space-y-2.5">
            <h2 className="text-2xl sm:text-3xl font-normal text-[#333] leading-snug">
              What happened?
            </h2>
            <p className="text-sm sm:text-[15px] text-[#555] leading-relaxed">
              You visited a route that is not found anywhere. The requested URL{" "}
              <code className="bg-[#f0f0f0] border border-[#e0e0e0] px-1.5 py-0.5 rounded text-xs font-mono text-[#333]">
                {location.pathname}
              </code>{" "}
              does not correspond to any active page or endpoint.
            </p>
          </div>

          {/* COLUMN 2: WHAT CAN I DO */}
          <div className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-normal text-[#333] leading-snug">
              What can I do?
            </h2>
            <p className="text-sm sm:text-[15px] text-[#555] leading-relaxed">
              Please check the URL for typos or return back to the application dashboard.
            </p>

            {/* ACTION BUTTONS */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 py-2 px-4 rounded border border-[#0045a6] text-[#0051c3] hover:bg-[#003681] hover:text-white text-xs font-semibold transition cursor-pointer"
              >
                <ArrowLeft size={13} />
                <span>Go Back</span>
              </button>

              <Link
                to={getHomeRoute()}
                className="inline-flex items-center gap-2 py-2 px-4 rounded bg-[#0051c3] hover:bg-[#003681] text-white text-xs font-semibold transition shadow-xs cursor-pointer"
              >
                <Home size={13} />
                <span>{isAuthenticated ? "Return to Dashboard" : "Sign In Portal"}</span>
              </Link>
            </div>
          </div>

        </div>

      </div>

      {/* CLOUDFLARE STYLE FOOTER */}
      <footer className="w-full border-t border-[#ebebeb] py-6 sm:py-8 px-6 text-center sm:text-left text-[13px] text-[#666]">
        <div className="max-w-[960px] mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span>
              Ray ID: <strong className="font-semibold text-[#333]">{rayId}</strong>
            </span>
            <span className="hidden sm:inline">&bull;</span>
            <span>
              Your IP:{" "}
              {!showIp ? (
                <button
                  type="button"
                  onClick={() => setShowIp(true)}
                  className="text-[#0051c3] hover:text-[#ee730a] hover:underline cursor-pointer"
                >
                  Click to reveal
                </button>
              ) : (
                <span className="font-mono text-[#333]">127.0.0.1 (Client)</span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#888]">
            <span>Performance &amp; security by</span>
            <span className="font-semibold text-[#0051c3]">Sugo Dispatch System</span>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default NotFoundPage;
