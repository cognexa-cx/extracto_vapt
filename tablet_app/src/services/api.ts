// Base URL for the backend this kiosk talks to — Cloud Backend (Azure
// Document Intelligence OCR + Azure OpenAI/Groq extraction, SQL Server,
// local-disk image storage). Set VITE_CLOUD_API_URL in .env for your
// deployment (see .env.development.local); defaults to localhost for local
// dev on the same machine as the backend.
const BASE_URL = import.meta.env.VITE_CLOUD_API_URL || "http://localhost:8001";

// Per-operator login (see authService.ts) replaces the old shared
// device-key-only auth — whoever's on shift logs in with their own
// account, and every request now carries their Bearer token instead of one
// key shared by the whole kiosk. Every service file in this app calls the
// backend with plain `fetch(...)`, so rather than threading this header
// through each call site individually, we patch `window.fetch` once here
// (every service already imports this module for BASE_URL, so this side
// effect always runs before any request goes out) to attach it to every
// request aimed at BASE_URL, and to force back to the login screen if the
// backend ever answers 401 (token expired, revoked, or never existed).
if (typeof window !== "undefined" && !window.__extractoFetchPatched) {
  window.__extractoFetchPatched = true;
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : (input as any)?.url || "";
    if (url.startsWith(BASE_URL)) {
      const token = localStorage.getItem("extracto_tab_token");
      if (token) {
        const headers = new Headers(init.headers || {});
        headers.set("Authorization", `Bearer ${token}`);
        init = { ...init, headers };
      }
    }
    const response = await originalFetch(input, init);
    if (response.status === 401 && url.startsWith(BASE_URL)) {
      localStorage.removeItem("extracto_tab_token");
      localStorage.removeItem("extracto_tab_user");
      window.dispatchEvent(new Event("extracto-tab-unauthorized"));
    }
    return response;
  };
}

export default BASE_URL;
