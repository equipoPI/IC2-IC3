import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    watch: {
      usePolling: true,
    },
    // Permitir peticiones desde túneles Ngrok y dominios remotos
    allowedHosts: [
      '.ngrok-free.dev',
      '.ngrok.io',
      '.ngrok.app',
      'remarry-anyplace-appraiser.ngrok-free.dev',
      'localhost',
      '127.0.0.1',
    ],
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://backend:8000',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: process.env.VITE_WS_BACKEND || process.env.VITE_API_URL || 'http://backend:8000',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
