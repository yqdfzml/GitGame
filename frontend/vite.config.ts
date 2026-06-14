import vue from "@vitejs/plugin-vue";
import type { ProxyOptions } from "vite";
import { defineConfig } from "vite";

/**
 * 创建开发环境 API 代理配置。
 * 功能：把前端 fetch 请求转发到 NestJS，但浏览器刷新页面路由时仍返回 SPA。
 * 参数：无。
 * 返回值：Vite proxy 单项配置。
 */
const createApiProxy = (): ProxyOptions => ({
  target: "http://localhost:3000",
  changeOrigin: true,
  bypass(req) {
    // 浏览器直链/刷新时 Accept 含 text/html，应走 SPA 而不是后端 JSON 接口
    const acceptHeader = req.headers.accept ?? "";
    if (acceptHeader.includes("text/html")) {
      return "/index.html";
    }
  },
});

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      "/auth": createApiProxy(),
      "/levels": createApiProxy(),
      "/attempts": createApiProxy(),
      "/leaderboard": createApiProxy(),
      "/home": createApiProxy(),
      "/users": createApiProxy(),
      "/admin": createApiProxy(),
      "/healthz": createApiProxy(),
    },
  },
});
