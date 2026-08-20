import React from "react";
import { RouterProvider } from "react-router";
import { Toaster } from "sonner";
import { router } from "./routes";
import { AuthProvider } from "../context/AuthContext";
import { OfflineBanner } from "../components/OfflineBanner";
import { ErrorBoundary } from "../components/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <OfflineBanner />
        <Toaster richColors position="top-right" />
        <RouterProvider router={router} />
      </AuthProvider>
    </ErrorBoundary>
  );
}
