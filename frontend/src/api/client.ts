/**
 * API 客户端封装。
 * 功能：统一 fetch、Cookie 凭证与 access token 过期自动刷新。
 * 参数：通过各方法传入路径和数据。
 * 返回值：解析后的 JSON 或抛出错误。
 */

import { clearAuthUser, saveAuthUser } from "./authStorage";
import type { AuthUser, LevelSummary, LevelUnlockResult, PointWalletSummary } from "../types";

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

/**
 * 发送 multipart 注册请求。
 * 功能：上传英雄帖、账号信息与头像文件。
 * 参数：formData - 注册表单数据。
 * 返回值：响应 JSON。
 */
const requestRegisterForm = (formData: FormData): Promise<{ user: AuthUser }> => {
  return fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    body: formData,
    credentials: "include",
  }).then((response) => {
    if (!response.ok) {
      return response.json().then((data: { message?: string | string[] }) => {
        const msg = Array.isArray(data.message) ? data.message.join(", ") : data.message;
        throw new Error(msg ?? `请求失败: ${response.status}`);
      });
    }
    return response.json() as Promise<{ user: AuthUser }>;
  });
};

/** 认证 API */
export const authApi = {
  register: (data: {
    heroInviteCode: string;
    email: string;
    password: string;
    displayName: string;
    avatar: File;
  }) => {
    const formData = new FormData();
    formData.append("heroInviteCode", data.heroInviteCode);
    formData.append("email", data.email);
    formData.append("password", data.password);
    formData.append("displayName", data.displayName);
    formData.append("avatar", data.avatar);
    return requestRegisterForm(formData);
  },
  login: (data: { email: string; password: string }) =>
    request<{ user: AuthUser }>("/auth/login", { method: "POST", body: data, skipAuthRetry: true }),
  refresh: () => request<{ user: AuthUser }>("/auth/refresh", { method: "POST", skipAuthRetry: true }),
  logout: () => request<{ message: string }>("/auth/logout", { method: "POST", skipAuthRetry: true }),
  me: () => request<{ user: AuthUser }>("/auth/me", { method: "POST" }),
};

/** 关卡 API */
export const levelsApi = {
  list: () => request<LevelSummary[]>("/levels"),
  get: (id: string) =>
    request<{
      id: string;
      title: string;
      description: string;
      initialState: import("../types").RepoState;
      goalHints: string[];
      unlockCost: number;
      unlockStatus: import("../types").LevelUnlockStatus;
      canStart: boolean;
    }>(`/levels/${id}`),
  unlock: (id: string) => request<LevelUnlockResult>(`/levels/${id}/unlock`, { method: "POST" }),
};

/** 积分 API */
export const pointsApi = {
  summary: () => request<PointWalletSummary>("/points/me"),
  checkIn: () => request<PointWalletSummary>("/points/check-in", { method: "POST" }),
};

/** 练习 API */
export const attemptsApi = {
  create: (levelId: string) =>
    request<import("./types").AttemptDetail>(`/levels/${levelId}/attempts`, { method: "POST" }),
  get: (id: string) => request<import("./types").AttemptDetail>(`/attempts/${id}`),
  submitCommand: (id: string, command: string) =>
    request<import("./types").CommandResponse>(`/attempts/${id}/commands`, {
      method: "POST",
      body: { command },
    }),
  replay: (id: string) =>
    request<{
      attemptId: string;
      status: string;
      commands: import("./types").CommandEntry[];
      snapshots: Array<{ stepIndex: number; state: import("./types").RepoState; createdAt?: string }>;
    }>(`/attempts/${id}/replay`),
};

/** 排行榜 API */
export const leaderboardApi = {
  list: (levelId?: string) =>
    request<import("./types").LeaderboardEntry[]>(
      levelId ? `/leaderboard?levelId=${levelId}` : "/leaderboard",
    ),
};

/** 首页 API */
export const homeApi = {
  overview: () => request<import("./types").HomeOverview>("/home/overview"),
};

/** 用户 API */
export const usersApi = {
  stats: () => request<import("./types").UserStats>("/users/me/stats"),
  badges: () => request<import("./types").UserBadgesResponse>("/users/me/badges"),
};

/** 管理 API */
export const adminApi = {
  listLevels: (chapterId?: string) =>
    request<Array<{
      id: string;
      courseId: string;
      chapterId: string | null;
      title: string;
      description: string;
      difficulty: string;
      sortOrder: number;
      status: string;
      publishedAt: string | null;
      updatedAt: string;
    }>>(chapterId ? `/admin/levels?chapterId=${chapterId}` : "/admin/levels"),
  getLevel: (id: string) =>
    request<{
      id: string;
      courseId: string;
      chapterId: string | null;
      title: string;
      description: string;
      difficulty: string;
      sortOrder: number;
      status: string;
      publishedAt: string | null;
      initialState: Record<string, unknown>;
      goal: Record<string, unknown>;
      constraints: Record<string, unknown>;
      validation: { valid: boolean; errors: string[] };
    }>(`/admin/levels/${id}`),
  createLevel: (data: Record<string, unknown>) =>
    request<{ id: string }>("/admin/levels", { method: "POST", body: data }),
  updateLevel: (id: string, data: Record<string, unknown>) =>
    request<{ id: string; status: string; title: string }>(`/admin/levels/${id}`, {
      method: "PATCH",
      body: data,
    }),
  publishLevel: (id: string) =>
    request<{ id: string; status: string }>(`/admin/levels/${id}/publish`, { method: "POST" }),
  archiveLevel: (id: string) =>
    request<{ id: string; status: string }>(`/admin/levels/${id}/archive`, { method: "POST" }),
};
