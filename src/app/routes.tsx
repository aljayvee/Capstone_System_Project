import React from "react";
import { createBrowserRouter } from "react-router";
import LoginPage from "../components/LoginPage";
import { ProtectedRoute } from "../components/ProtectedRoute";
import OwnerPortal from "../portals/owner/OwnerPortal";
import DispatcherPortal from "../portals/dispatcher/DispatcherPortal";

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
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-4">
          <h2 className="text-xl font-bold text-amber-400">Mobile Application Required</h2>
          <p className="text-slate-400 text-sm">
            Rider Portal operates on the Mobile Application platform. Please log in using the Rider Mobile App.
          </p>
        </div>
      </div>
    ),
  },
  {
    path: "/customer",
    element: (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-4">
          <h2 className="text-xl font-bold text-sky-400">Mobile Application Required</h2>
          <p className="text-slate-400 text-sm">
            Customer Portal operates on the Mobile Application platform. Please log in using the Customer Mobile App.
          </p>
        </div>
      </div>
    ),
  },
]);
