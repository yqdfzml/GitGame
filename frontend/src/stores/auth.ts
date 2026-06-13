import { defineStore } from "pinia";
import { authApi } from "../api/client";
import type { AuthUser } from "../types";

/**
 * 认证状态 Store。
 * 功能：管理登录用户信息和登录/登出动作。
 * 参数：通过 actions 传入凭证。
 * 返回值：响应式 user 状态。
 */
export const useAuthStore = defineStore("auth", {
  state: () => ({
    /** 当前登录用户，null 表示未登录 */
    user: null as AuthUser | null,
    /** 是否正在加载用户信息 */
    loading: false,
  }),

  getters: {
    /** 是否已登录 */
    isLoggedIn: (state) => state.user !== null,
    /** 是否管理员 */
    isAdmin: (state) => state.user?.role === "ADMIN",
  },

  actions: {
    /**
     * 尝试从 Cookie 恢复登录态。
     * 功能：调用 /auth/me 检查 Cookie 是否有效。
     * 参数：无。
     * 返回值：Promise<void>。
     */
    restoreSession() {
      this.loading = true;
      return authApi
        .me()
        .then((data) => {
          this.user = {
            id: data.user.sub,
            email: "",
            displayName: "",
            role: data.user.role,
          };
        })
        .catch(() => {
          this.user = null;
        })
        .finally(() => {
          this.loading = false;
        });
    },

    /**
     * 用户登录。
     * 功能：调用登录 API 并保存用户信息。
     * 参数：email、password。
     * 返回值：Promise<void>。
     */
    login(email: string, password: string) {
      return authApi.login({ email, password }).then((data) => {
        this.user = data.user;
      });
    },

    /**
     * 用户注册。
     * 功能：注册并自动登录。
     * 参数：email、password、displayName。
     * 返回值：Promise<void>。
     */
    register(email: string, password: string, displayName: string) {
      return authApi.register({ email, password, displayName }).then((data) => {
        this.user = data.user;
      });
    },

    /**
     * 用户登出。
     * 功能：清除 Cookie 和本地状态。
     * 参数：无。
     * 返回值：Promise<void>。
     */
    logout() {
      return authApi.logout().finally(() => {
        this.user = null;
      });
    },
  },
});
