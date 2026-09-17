import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
<<<<<<< HEAD
    // Permitir peticiones desde contenedores (host.docker.internal)
    allowedHosts: ['host.docker.internal'],
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://host.docker.internal:8000',
=======
    watch: {
      usePolling: true,
    },
    // Permitir peticiones desde túneles y dominios remotos
    allowedHosts: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://backend:8000',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: process.env.VITE_WS_BACKEND || process.env.VITE_API_URL || 'http://backend:8000',
        ws: true,
>>>>>>> 47cfd00238b716167f1fba74d6ec7a5a96b2b385
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
