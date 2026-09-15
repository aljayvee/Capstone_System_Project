import React, { Suspense, lazy } from "react";
import { createBrowserRouter } from "react-router";
import LoginPage from "../components/LoginPage";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { GuestRoute } from "../components/GuestRoute";

const OwnerPortal = lazy(() => import("../portals/owner/OwnerPortal"));
const DispatcherPortal = lazy(() => import("../portals/dispatcher/DispatcherPortal"));
const PlacesDirectoryScreen = lazy(() => import("../portals/owner/screens/PlacesDirectoryScreen"));
const MobileAppNoticeModal = lazy(() =>
  import("../components/MobileAppNoticeModal").then((m) => ({ default: m.MobileAppNoticeModal }))
);
const NotFoundPage = lazy(() =>
  import("../components/NotFoundPage").then((m) => ({ default: m.NotFoundPage }))
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
  },
  {
    path: "/rider",
    element: (
      <Suspense fallback={<RouteLoadingFallback />}>
        <MobileAppNoticeModal isOpen={true} roleName="Rider" />
      </Suspense>
    ),
  },
  {
    path: "/customer",
    element: (
      <Suspense fallback={<RouteLoadingFallback />}>
        <MobileAppNoticeModal isOpen={true} roleName="Customer" />
      </Suspense>
    ),
  },
  {
    path: "*",
    element: (
      <Suspense fallback={<RouteLoadingFallback />}>
        <NotFoundPage />
      </Suspense>
    ),
  },
]);

