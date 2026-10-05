import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import "./styles/index.css";

// Global resilience: Auto-reload on stale dynamic import / chunk load failure after a new deployment
window.addEventListener("vite:preloadError", () => {
  const reloadKey = "sugo_preload_reload";
  const lastReload = sessionStorage.getItem(reloadKey);
  const now = Date.now();
  // Prevent infinite reload loop if a chunk is persistently broken (only reload once every 10s)
  if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
    sessionStorage.setItem(reloadKey, now.toString());
    window.location.reload();
  }
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

