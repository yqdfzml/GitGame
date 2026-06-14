/**
 * 管理后台 API 客户端。
 * 功能：统一 fetch、Cookie 凭证与 access token 过期自动刷新。
 * 参数：通过各方法传入路径和数据。
 * 返回值：解析后的 JSON 或抛出错误。
 */

import { clearAuthUser, saveAuthUser } from "./authStorage";
import type { AuthUser } from "@shared/types";
import type {
  AdminAttemptDetail,
  AdminAttemptListFilters,
  AdminAttemptListResult,
  AdminBadgeDefinitionItem,
  AdminCreateInvitePayload,
  AdminDashboardOverview,
  AdminInviteActionResult,
  AdminInviteListItem,
  AdminLeaderboardItem,
  AdminLedgerListResult,
  AdminLevelActionResult,
  AdminLevelDetail,
  AdminLevelFormData,
  AdminLevelItem,
  AdminLevelListFilters,
  AdminLevelSortResult,
  AdminRevokeSessionsResult,
  AdminUnlockListResult,
  AdminUserActionResult,
  AdminUserDeleteResult,
  AdminUserUpdatePayload,
  AdminUserDetail,
  AdminUserListFilters,
  AdminUserListResult,
  AdminWalletListResult,
} from "../types/admin";

/** API 基础路径，开发环境走 Vite 同源代理 */
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

/** 请求选项 */
interface RequestOptions {
  method?: string;
  body?: unknown;
  /** 为 true 时不触发 refresh 重试 */
  skipAuthRetry?: boolean;
}

/** 是否正在刷新 token，避免并发重复请求 */
let refreshInFlight: Promise<boolean> | null = null;

/**
 * 尝试用 refresh token 轮换新的 access token。
 * 功能：401 时由 request 自动调用。
 * 参数：无。
 * 返回值：是否刷新成功。
 */
function tryRefreshSession(): Promise<boolean> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  })
    .then((response) => {
      if (!response.ok) {
        return false;
      }
      return response.json().then((data: { user: AuthUser }) => {
        saveAuthUser(data.user);
        return true;
      });
    })
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

/**
 * 发送 HTTP 请求。
 * 功能：封装 fetch，401 时自动 refresh 并重试一次。
 * 参数：path - API 路径；options - 请求选项。
 * 返回值：响应 JSON。
 */
const request = <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const headers: Record<string, string> = {};
  let body: string | undefined;

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const doFetch = () =>
    fetch(`${API_BASE}${path}`, {
      method: options.method ?? "GET",
      headers,
      body,
      credentials: "include",
    });

  const parseResponse = (response: Response): Promise<T> => {
    if (!response.ok) {
      return response.json().then((data: { message?: string | string[] }) => {
        const msg = Array.isArray(data.message) ? data.message.join(", ") : data.message;
        throw new Error(msg ?? `请求失败: ${response.status}`);
      });
    }
    return response.json() as Promise<T>;
  };

  return doFetch().then((response) => {
    if (response.status === 401 && !options.skipAuthRetry && !path.startsWith("/auth/refresh")) {
      return tryRefreshSession().then((refreshed) => {
        if (!refreshed) {
          clearAuthUser();
          throw new Error("登录已过期，请重新登录");
        }
        return doFetch().then(parseResponse);
      });
    }
    return parseResponse(response);
  });
};

/** 认证 API（管理后台仅登录/登出） */
export const authApi = {
  login: (data: { email: string; password: string }) =>
    request<{ user: AuthUser }>("/auth/login", { method: "POST", body: data, skipAuthRetry: true }),
  refresh: () => request<{ user: AuthUser }>("/auth/refresh", { method: "POST", skipAuthRetry: true }),
  logout: () => request<{ message: string }>("/auth/logout", { method: "POST", skipAuthRetry: true }),
  me: () => request<{ user: AuthUser }>("/auth/me", { method: "POST" }),
};

/** 管理 API */
export const adminApi = {
  listLevels: (filters: Partial<AdminLevelListFilters> = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.chapterId) params.set("chapterId", filters.chapterId);
    if (filters.status) params.set("status", filters.status);
    if (filters.difficulty) params.set("difficulty", filters.difficulty);
    const query = params.toString();
    return request<AdminLevelItem[]>(query ? `/admin/levels?${query}` : "/admin/levels");
  },
  getLevel: (id: string) => request<AdminLevelDetail>(`/admin/levels/${id}`),
  createLevel: (data: AdminLevelFormData) =>
    request<AdminLevelActionResult>("/admin/levels", { method: "POST", body: data }),
  updateLevel: (id: string, data: AdminLevelFormData) =>
    request<AdminLevelActionResult>(`/admin/levels/${id}`, { method: "PATCH", body: data }),
  publishLevel: (id: string) =>
    request<AdminLevelActionResult>(`/admin/levels/${id}/publish`, { method: "POST" }),
  archiveLevel: (id: string) =>
    request<AdminLevelActionResult>(`/admin/levels/${id}/archive`, { method: "POST" }),
  cloneLevel: (id: string) =>
    request<AdminLevelActionResult>(`/admin/levels/${id}/clone`, { method: "POST" }),
  updateLevelSort: (
    id: string,
    data: { courseId?: string; chapterId?: string; sortOrder?: number },
  ) => request<AdminLevelSortResult>(`/admin/levels/${id}/sort`, { method: "PATCH", body: data }),
};

/** 管理端用户 API */
export const adminUsersApi = {
  listUsers: (filters: Partial<AdminUserListFilters> = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.role) params.set("role", filters.role);
    if (filters.status) params.set("status", filters.status);
    if (filters.page) params.set("page", String(filters.page));
    if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
    const query = params.toString();
    return request<AdminUserListResult>(query ? `/admin/users?${query}` : "/admin/users");
  },
  getUser: (id: string) => request<AdminUserDetail>(`/admin/users/${id}`),
  updateUser: (id: string, data: AdminUserUpdatePayload) =>
    request<AdminUserActionResult>(`/admin/users/${id}`, { method: "PATCH", body: data }),
  deleteUser: (id: string) =>
    request<AdminUserDeleteResult>(`/admin/users/${id}`, { method: "DELETE" }),
  updateStatus: (id: string, status: "ACTIVE" | "DISABLED") =>
    request<AdminUserActionResult>(`/admin/users/${id}/status`, { method: "PATCH", body: { status } }),
  updateRole: (id: string, role: "USER" | "ADMIN") =>
    request<AdminUserActionResult>(`/admin/users/${id}/role`, { method: "PATCH", body: { role } }),
  revokeSessions: (id: string) =>
    request<AdminRevokeSessionsResult>(`/admin/users/${id}/revoke-sessions`, { method: "POST" }),
};

/** 管理端练习记录 API */
export const adminAttemptsApi = {
  listAttempts: (filters: Partial<AdminAttemptListFilters> = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.levelId) params.set("levelId", filters.levelId);
    if (filters.userId) params.set("userId", filters.userId);
    if (filters.status) params.set("status", filters.status);
    if (filters.page) params.set("page", String(filters.page));
    if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
    const query = params.toString();
    return request<AdminAttemptListResult>(query ? `/admin/attempts?${query}` : "/admin/attempts");
  },
  getAttempt: (id: string) => request<AdminAttemptDetail>(`/admin/attempts/${id}`),
};

/** 管理端邀请码 API */
export const adminInvitesApi = {
  listInvites: () => request<AdminInviteListItem[]>("/admin/invites"),
  createInvite: (data: AdminCreateInvitePayload) =>
    request<AdminInviteActionResult>("/admin/invites", { method: "POST", body: data }),
  revokeInvite: (id: string) =>
    request<AdminInviteActionResult>(`/admin/invites/${id}/revoke`, { method: "POST" }),
};

/** 管理端 Dashboard API */
export const adminDashboardApi = {
  getOverview: () => request<AdminDashboardOverview>("/admin/dashboard"),
};

/** 管理端游戏化运营 API */
export const adminGamificationApi = {
  listWallets: (filters: { search?: string; page?: number; pageSize?: number } = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.page) params.set("page", String(filters.page));
    if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
    const query = params.toString();
    return request<AdminWalletListResult>(query ? `/admin/points/wallets?${query}` : "/admin/points/wallets");
  },
  grantPoints: (data: import("../types/admin").AdminGrantPointsPayload) =>
    request<import("../types/admin").AdminGrantPointsResult>("/admin/points/grant", {
      method: "POST",
      body: data,
    }),
  listLedgers: (filters: { search?: string; userId?: string; page?: number; pageSize?: number } = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.userId) params.set("userId", filters.userId);
    if (filters.page) params.set("page", String(filters.page));
    if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
    const query = params.toString();
    return request<AdminLedgerListResult>(query ? `/admin/points/ledgers?${query}` : "/admin/points/ledgers");
  },
  listUnlocks: (filters: {
    search?: string;
    userId?: string;
    levelId?: string;
    page?: number;
    pageSize?: number;
  } = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.userId) params.set("userId", filters.userId);
    if (filters.levelId) params.set("levelId", filters.levelId);
    if (filters.page) params.set("page", String(filters.page));
    if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
    const query = params.toString();
    return request<AdminUnlockListResult>(query ? `/admin/points/unlocks?${query}` : "/admin/points/unlocks");
  },
  listBadgeDefinitions: () => request<AdminBadgeDefinitionItem[]>("/admin/badges/definitions"),
  getLeaderboard: (levelId?: string, limit = 50) => {
    const params = new URLSearchParams();
    if (levelId) params.set("levelId", levelId);
    params.set("limit", String(limit));
    return request<AdminLeaderboardItem[]>(`/admin/leaderboard?${params.toString()}`);
  },
};
