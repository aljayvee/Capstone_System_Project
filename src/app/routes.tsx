import React from "react";
import { createBrowserRouter } from "react-router";
import LoginPage from "../components/LoginPage";
import { ProtectedRoute } from "../components/ProtectedRoute";
import OwnerPortal from "../portals/owner/OwnerPortal";
import DispatcherPortal from "../portals/dispatcher/DispatcherPortal";
import { MobileAppNoticeModal } from "../components/MobileAppNoticeModal";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LoginPage,
  },
  {
    path: "/owner",
    element: (
      <ProtectedRoute allowedRoles={["owner"]}>
        <OwnerPortal />
      </ProtectedRoute>
    ),
  },
  {
    path: "/dispatcher",
    element: (
      <ProtectedRoute allowedRoles={["dispatcher"]}>
        <DispatcherPortal />
      </ProtectedRoute>
    ),
  },
  {
    path: "/rider",
    element: (
      <MobileAppNoticeModal
        isOpen={true}
        roleName="Rider"
        onClose={() => {
          window.location.href = "/";
        }}
      />
    ),
  },
  {
    path: "/customer",
    element: (
      <MobileAppNoticeModal
        isOpen={true}
        roleName="Customer"
        onClose={() => {
          window.location.href = "/";
        }}
      />
    ),
  },
]);

