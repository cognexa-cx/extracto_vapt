/// <reference types="vite/client" />

// Marker set by services/api.ts to guard its one-time window.fetch patch
// against re-running (e.g. under HMR) — not a real DOM property.
interface Window {
  __extractoFetchPatched?: boolean;
}
