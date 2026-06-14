import { fileURLToPath, URL } from "node:url";
import vue from "@vitejs/plugin-vue";
import type { ProxyOptions } from "vite";
import { defineConfig } from "vite";

/** 仓库根目录，供 dev server 读取 frontend 共享样式 */
const repoRoot = fileURLToPath(new URL("..", import.meta.url));
/** 玩家端 src，管理后台共用类型与工具函数 */
const sharedSrcRoot = fileURLToPath(new URL("../frontend/src", import.meta.url));
/** 管理后台 src */
const adminSrcRoot = fileURLToPath(new URL("./src", import.meta.url));

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
  plugins: [
    vue({
      // monorepo 下 @shared 可能解析到 frontend 目录中的 .vue 文件
      include: [/\.vue$/],
    }),
  ],
  resolve: {
    alias: [
      // @shared 必须排在 @/ 之前，避免 @ 前缀误匹配 @shared/xxx
      { find: /^@shared\/(.*)/, replacement: `${sharedSrcRoot}/$1` },
      { find: /^@\/(.*)/, replacement: `${adminSrcRoot}/$1` },
    ],
  },
  server: {
    port: 5174,
    fs: {
      allow: [repoRoot],
    },
    proxy: {
      "/auth": createApiProxy(),
      "/admin": createApiProxy(),
      "/uploads": createApiProxy(),
      "/healthz": createApiProxy(),
    },
  },
});
