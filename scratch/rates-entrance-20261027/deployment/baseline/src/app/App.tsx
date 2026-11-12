import React, { useEffect } from "react";
import { RouterProvider } from "react-router";
import { Toaster } from "sonner";
import { router } from "./routes";
import { AuthProvider } from "../context/AuthContext";
import { SysAdminAuthProvider } from "../portals/sysadmin/context/SysAdminAuthContext";
import { SysAdminLanguageProvider } from "../portals/sysadmin/context/SysAdminLanguageContext";
import { OfflineBanner } from "../components/OfflineBanner";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { SessionGuard } from "../components/modals/SessionGuard";
import { LandscapeBanner } from "../components/LandscapeBanner";
import { useDeviceTier } from "../hooks/useDeviceTier";
import { initAudioUnlock } from "../utils/audioHapticAlert";

export default function App() {
  const { isMobile } = useDeviceTier();

  useEffect(() => {
    initAudioUnlock();
  }, []);

  return (
    <ErrorBoundary>
      <SysAdminLanguageProvider>
        <SysAdminAuthProvider>
          <AuthProvider>
            <LandscapeBanner />
            <OfflineBanner />
            <SessionGuard />
            <Toaster
              richColors
              position={isMobile ? "top-center" : "top-right"}
              toastOptions={{
                style: {
                  marginTop: isMobile ? "max(12px, env(safe-area-inset-top, 0px))" : undefined,
                },
              }}
            />
            <RouterProvider router={router} />
          </AuthProvider>
        </SysAdminAuthProvider>
      </SysAdminLanguageProvider>
    </ErrorBoundary>
  );
}
