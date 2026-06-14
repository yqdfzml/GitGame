import { fileURLToPath, URL } from "node:url";
import vue from "@vitejs/plugin-vue";
import type { ProxyOptions } from "vite";
import { defineConfig } from "vite";

/**
 * 创建开发环境 API 代理配置。
 * 功能：把管理后台 fetch 请求转发到 NestJS。
 * 参数：无。
 * 返回值：Vite proxy 单项配置。
 */
const createApiProxy = (): ProxyOptions => ({
  target: "http://localhost:3000",
  changeOrigin: true,
  bypass(req) {
    const acceptHeader = req.headers.accept ?? "";
    if (acceptHeader.includes("text/html")) {
      return "/index.html";
    }
  },
});

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@shared": fileURLToPath(new URL("../frontend/src", import.meta.url)),
    },
  },
  server: {
    port: 5174,
    proxy: {
      "/auth": createApiProxy(),
      "/admin": createApiProxy(),
      "/uploads": createApiProxy(),
      "/healthz": createApiProxy(),
    },
  },
});
