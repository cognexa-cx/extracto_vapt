import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The tab app talks directly to the local backend (VITE_LOCAL_API_URL, see
// services/api.js and .env.development.local) — no dev proxy needed.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3001,
  },
  build: {
    outDir: "dist",
  },
});
