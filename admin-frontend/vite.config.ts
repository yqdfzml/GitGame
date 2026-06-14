import { fileURLToPath, URL } from "node:url";
import vue from "@vitejs/plugin-vue";
import type { ProxyOptions } from "vite";
import { defineConfig } from "vite";

/** 仓库根目录，供 dev server 读取 frontend 共享资源 */
const repoRoot = fileURLToPath(new URL("..", import.meta.url));
/** 玩家端 src，管理后台与玩家端共用样式与类型 */
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
  plugins: [vue()],
  resolve: {
    alias: [
      { find: "@", replacement: adminSrcRoot },
      // 显式匹配 @shared/xxx，避免 dev 模式下别名未命中导致 styles.css 找不到
      { find: /^@shared\/(.*)/, replacement: `${sharedSrcRoot}/$1` },
    ],
  },
  server: {
    port: 5174,
    // monorepo 下允许读取 frontend 目录中的共享样式
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
