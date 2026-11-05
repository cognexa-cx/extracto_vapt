import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 3000,
      proxy: {
        "/api": {
          target: env.VITE_WEB_API_URL || "http://localhost:8000",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
    build: {
      outDir: "dist",
      rollupOptions: {
        output: {
          // Split heavy, rarely-changing vendor libs out of the main
          // bundle into their own chunks. Before this, the whole app
          // (including recharts/jspdf/xlsx, which most pages never touch)
          // shipped as one 2.5MB chunk on every route — every user paid
          // that cost on first load, and any app-code change busted the
          // browser cache for these libs too even though they hadn't
          // changed. Split, each chunk is cached independently and the
          // ones a given page doesn't need aren't blocking its render.
          manualChunks: {
            "vendor-react": ["react", "react-dom", "react-router-dom"],
            "vendor-charts": ["recharts", "framer-motion"],
            "vendor-pdf": ["jspdf", "jspdf-autotable"],
            "vendor-xlsx": ["xlsx"],
            "vendor-icons": ["lucide-react"],
          },
        },
      },
    },
  };
});
