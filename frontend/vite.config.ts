import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const apiTarget = process.env.VITE_API_PROXY ?? "http://localhost:8000";
const storageTarget = process.env.VITE_STORAGE_PROXY ?? "http://localhost:8010";

const proxy = {
  "/api": { target: apiTarget, changeOrigin: true },
  "/files": { target: storageTarget, changeOrigin: true },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    watch: { usePolling: true },
    proxy,
  },
  preview: {
    host: true,
    port: 4173,
    proxy,
  },
});
