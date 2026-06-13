import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      "/auth": { target: "http://localhost:3000", changeOrigin: true },
      "/levels": { target: "http://localhost:3000", changeOrigin: true },
      "/attempts": { target: "http://localhost:3000", changeOrigin: true },
      "/leaderboard": { target: "http://localhost:3000", changeOrigin: true },
      "/users": { target: "http://localhost:3000", changeOrigin: true },
      "/admin": { target: "http://localhost:3000", changeOrigin: true },
      "/healthz": { target: "http://localhost:3000", changeOrigin: true },
    },
  },
});
