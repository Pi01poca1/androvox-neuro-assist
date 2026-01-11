import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// In dev/preview, ensure any previously installed Service Worker doesn't keep serving stale cached bundles.
if (import.meta.env.DEV && typeof window !== "undefined" && "serviceWorker" in navigator) {
  const key = "dev_sw_unregistered_once";
  if (navigator.serviceWorker.controller && !sessionStorage.getItem(key)) {
    sessionStorage.setItem(key, "1");
    navigator.serviceWorker.getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .finally(() => {
        // One-time reload to pick up the latest assets after unregister.
        window.location.reload();
      });
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
