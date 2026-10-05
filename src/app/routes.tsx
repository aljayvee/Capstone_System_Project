import React, { Suspense } from "react";
import { createBrowserRouter } from "react-router";
import LoginPage from "../components/LoginPage";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { GuestRoute } from "../components/GuestRoute";
import { lazyWithRetry } from "../utils/lazyWithRetry";
import { RouteErrorBoundary } from "../components/RouteErrorBoundary";

const OwnerPortal = lazyWithRetry(() => import("../portals/owner/OwnerPortal"));
const DispatcherPortal = lazyWithRetry(() => import("../portals/dispatcher/DispatcherPortal"));
const PlacesDirectoryScreen = lazyWithRetry(() => import("../portals/owner/screens/PlacesDirectoryScreen"));
const MobileAppNoticeModal = lazyWithRetry(() =>
  import("../components/MobileAppNoticeModal").then((m) => ({ default: m.MobileAppNoticeModal }))
);
const NotFoundPage = lazyWithRetry(() =>
  import("../components/NotFoundPage").then((m) => ({ default: m.NotFoundPage }))
);
const SysAdminPortal = lazyWithRetry(() => import("../portals/sysadmin/SysAdminPortal"));
const SysAdminMagicLinkVerificationPage = lazyWithRetry(() =>
  import("../portals/sysadmin/components/SysAdminMagicLinkVerificationPage").then((m) => ({
    default: m.SysAdminMagicLinkVerificationPage,
  }))
);

const RouteLoadingFallback: React.FC = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
    <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mb-3" />
    <p className="text-slate-400 text-xs font-medium tracking-wider uppercase">Loading Portal...</p>
  </div>
);

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <GuestRoute>
        <LoginPage />
      </GuestRoute>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/owner",
    element: (
      <ProtectedRoute allowedRoles={["owner"]}>
        <Suspense fallback={<RouteLoadingFallback />}>
          <OwnerPortal />
        </Suspense>
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/places",
    element: (
      <ProtectedRoute allowedRoles={["owner"]}>
        <Suspense fallback={<RouteLoadingFallback />}>
          <PlacesDirectoryScreen />
        </Suspense>
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/dispatcher",
    element: (
      <ProtectedRoute allowedRoles={["dispatcher"]}>
        <Suspense fallback={<RouteLoadingFallback />}>
          <DispatcherPortal />
        </Suspense>
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/rider",
    element: (
      <Suspense fallback={<RouteLoadingFallback />}>
        <MobileAppNoticeModal isOpen={true} roleName="Rider" />
      </Suspense>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/customer",
    element: (
      <Suspense fallback={<RouteLoadingFallback />}>
        <MobileAppNoticeModal isOpen={true} roleName="Customer" />
      </Suspense>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/sysadmin",
    element: (
      <Suspense fallback={<RouteLoadingFallback />}>
        <SysAdminPortal />
      </Suspense>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/sysadmin/verify-email",
    element: (
      <Suspense fallback={<RouteLoadingFallback />}>
        <SysAdminMagicLinkVerificationPage />
      </Suspense>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "*",
    element: (
      <Suspense fallback={<RouteLoadingFallback />}>
        <NotFoundPage />
      </Suspense>
    ),
    errorElement: <RouteErrorBoundary />,
  },
]);

