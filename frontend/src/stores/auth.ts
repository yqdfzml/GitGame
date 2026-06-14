import { defineStore } from "pinia";
import { authApi } from "../api/client";
import { clearAuthUser, loadAuthUser, saveAuthUser } from "../api/authStorage";
import type { AuthUser } from "../types";

/**
 * 将用户写入 store 并同步 localStorage。
 * 功能：登录态变更时统一持久化。
 * 参数：user - 用户摘要。
 * 返回值：无。
 */
function applyUser(store: { user: AuthUser | null }, user: AuthUser) {
  store.user = user;
  saveAuthUser(user);
}

/**
 * 认证状态 Store。
 * 功能：管理登录用户、localStorage 持久化与会话恢复。
 * 参数：通过 actions 传入凭证。
 * 返回值：响应式 user 状态。
 */
export const useAuthStore = defineStore("auth", {
  state: () => ({
    /** 当前登录用户，null 表示未登录 */
    user: null as AuthUser | null,
    /** 是否正在恢复会话 */
    loading: false,
    /** 是否已完成启动时的会话引导 */
    bootstrapped: false,
  }),

  getters: {
    /** 是否已登录 */
    isLoggedIn: (state) => state.user !== null,
    /** 是否管理员 */
    isAdmin: (state) => state.user?.role === "ADMIN",
  },

  actions: {
    /**
     * 应用启动时恢复登录态。
     * 功能：先读 localStorage，再校验 /me，失败则尝试 refresh 轮换。
     * 参数：无。
     * 返回值：Promise<void>。
     */
    bootstrap() {
      if (this.bootstrapped) {
        return Promise.resolve();
      }

      this.loading = true;
      const cachedUser = loadAuthUser();
      if (cachedUser) {
        this.user = cachedUser;
      }

      return authApi
        .me()
        .then((data) => {
          applyUser(this, data.user);
        })
        .catch(() => {
          return authApi.refresh().then((data) => {
            applyUser(this, data.user);
          });
        })
        .catch(() => {
          this.user = null;
          clearAuthUser();
        })
        .finally(() => {
          this.loading = false;
          this.bootstrapped = true;
        });
    },

    /**
     * 用户登录。
     * 功能：调用登录 API 并持久化用户信息。
     * 参数：email、password。
     * 返回值：Promise<void>。
     */
    login(email: string, password: string) {
      return authApi.login({ email, password }).then((data) => {
        applyUser(this, data.user);
        this.bootstrapped = true;
      });
    },

    /**
     * 用户注册。
     * 功能：持英雄帖注册并自动登录，写入持久化。
     * 参数：payload - 注册信息含头像文件。
     * 返回值：Promise<void>。
     */
    register(payload: {
      heroInviteCode: string;
      email: string;
      password: string;
      displayName: string;
      avatar: File;
    }) {
      return authApi.register(payload).then((data) => {
        applyUser(this, data.user);
        this.bootstrapped = true;
      });
    },

    /**
     * 用户登出。
     * 功能：清除 Cookie 与本地缓存。
     * 参数：无。
     * 返回值：Promise<void>。
     */
    logout() {
      return authApi.logout().finally(() => {
        this.user = null;
        clearAuthUser();
      });
    },
  },
});
