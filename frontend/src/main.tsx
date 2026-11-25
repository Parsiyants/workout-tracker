import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// PWA: service worker живёт только в защищённом контексте (https или localhost)
const secureContext =
  window.location.protocol === "https:" ||
  ["localhost", "127.0.0.1"].includes(window.location.hostname);

if ("serviceWorker" in navigator && secureContext && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}
