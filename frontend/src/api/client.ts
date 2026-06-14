/**
 * API 客户端封装。
 * 功能：统一 fetch、Cookie 凭证与 access token 过期自动刷新。
 * 参数：通过各方法传入路径和数据。
 * 返回值：解析后的 JSON 或抛出错误。
 */

import { clearAuthUser, saveAuthUser } from "./authStorage";
import type {
  AdminLevelActionResult,
  AdminLevelDetail,
  AdminLevelFormData,
  AdminLevelItem,
  AdminLevelListFilters,
  AdminLevelSortResult,
  AdminRevokeSessionsResult,
  AdminUserActionResult,
  AdminUserDetail,
  AdminUserListFilters,
  AdminUserListResult,
} from "../types/admin";
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
  /**
   * 列出关卡。
   * 功能：支持搜索、章节、状态、难度筛选。
   * 参数：filters - 可选筛选条件。
   * 返回值：关卡摘要数组。
   */
  listLevels: (filters: Partial<AdminLevelListFilters> = {}) => {
    const params = new URLSearchParams();
    if (filters.search) {
      params.set("search", filters.search);
    }
    if (filters.chapterId) {
      params.set("chapterId", filters.chapterId);
    }
    if (filters.status) {
      params.set("status", filters.status);
    }
    if (filters.difficulty) {
      params.set("difficulty", filters.difficulty);
    }
    const query = params.toString();
    return request<AdminLevelItem[]>(query ? `/admin/levels?${query}` : "/admin/levels");
  },
  /**
   * 获取关卡详情。
   * 功能：返回完整配置与 schema 校验结果。
   * 参数：id - 关卡 id。
   * 返回值：关卡详情。
   */
  getLevel: (id: string) => request<AdminLevelDetail>(`/admin/levels/${id}`),
  /**
   * 创建草稿关卡。
   * 功能：写入 DRAFT 状态关卡。
   * 参数：data - 关卡表单数据。
   * 返回值：新关卡 id。
   */
  createLevel: (data: AdminLevelFormData) =>
    request<AdminLevelActionResult>("/admin/levels", { method: "POST", body: data }),
  /**
   * 更新关卡。
   * 功能：编辑草稿或已发布关卡内容。
   * 参数：id - 关卡 id；data - 更新数据。
   * 返回值：更新后的关卡摘要。
   */
  updateLevel: (id: string, data: AdminLevelFormData) =>
    request<AdminLevelActionResult>(`/admin/levels/${id}`, { method: "PATCH", body: data }),
  /**
   * 发布关卡。
   * 功能：DRAFT -> PUBLISHED。
   * 参数：id - 关卡 id。
   * 返回值：发布结果。
   */
  publishLevel: (id: string) =>
    request<AdminLevelActionResult>(`/admin/levels/${id}/publish`, { method: "POST" }),
  /**
   * 归档关卡。
   * 功能：PUBLISHED -> ARCHIVED。
   * 参数：id - 关卡 id。
   * 返回值：归档结果。
   */
  archiveLevel: (id: string) =>
    request<AdminLevelActionResult>(`/admin/levels/${id}/archive`, { method: "POST" }),
  /**
   * 复制关卡。
   * 功能：基于现有配置创建 DRAFT 副本。
   * 参数：id - 源关卡 id。
   * 返回值：新关卡摘要。
   */
  cloneLevel: (id: string) =>
    request<AdminLevelActionResult>(`/admin/levels/${id}/clone`, { method: "POST" }),
  /**
   * 调整关卡排序。
   * 功能：更新 courseId、chapterId 或 sortOrder。
   * 参数：id - 关卡 id；data - 排序字段。
   * 返回值：更新后的排序信息。
   */
  updateLevelSort: (
    id: string,
    data: { courseId?: string; chapterId?: string; sortOrder?: number },
  ) => request<AdminLevelSortResult>(`/admin/levels/${id}/sort`, { method: "PATCH", body: data }),
};

/** 管理端用户 API */
export const adminUsersApi = {
  /**
   * 分页列出用户。
   * 功能：支持搜索与角色、状态筛选。
   * 参数：filters - 筛选与分页条件。
   * 返回值：分页用户列表。
   */
  listUsers: (filters: Partial<AdminUserListFilters> = {}) => {
    const params = new URLSearchParams();
    if (filters.search) {
      params.set("search", filters.search);
    }
    if (filters.role) {
      params.set("role", filters.role);
    }
    if (filters.status) {
      params.set("status", filters.status);
    }
    if (filters.page) {
      params.set("page", String(filters.page));
    }
    if (filters.pageSize) {
      params.set("pageSize", String(filters.pageSize));
    }
    const query = params.toString();
    return request<AdminUserListResult>(query ? `/admin/users?${query}` : "/admin/users");
  },
  /**
   * 获取用户详情。
   * 功能：返回运营排查所需的用户快照。
   * 参数：id - 用户 id。
   * 返回值：用户详情。
   */
  getUser: (id: string) => request<AdminUserDetail>(`/admin/users/${id}`),
  /**
   * 更新用户状态。
   * 功能：启用或禁用账号。
   * 参数：id - 用户 id；status - 新状态。
   * 返回值：更新后的用户摘要。
   */
  updateStatus: (id: string, status: "ACTIVE" | "DISABLED") =>
    request<AdminUserActionResult>(`/admin/users/${id}/status`, { method: "PATCH", body: { status } }),
  /**
   * 更新用户角色。
   * 功能：调整 USER / ADMIN。
   * 参数：id - 用户 id；role - 新角色。
   * 返回值：更新后的用户摘要。
   */
  updateRole: (id: string, role: "USER" | "ADMIN") =>
    request<AdminUserActionResult>(`/admin/users/${id}/role`, { method: "PATCH", body: { role } }),
  /**
   * 撤销用户登录态。
   * 功能：作废全部 refresh token。
   * 参数：id - 用户 id。
   * 返回值：撤销数量。
   */
  revokeSessions: (id: string) =>
    request<AdminRevokeSessionsResult>(`/admin/users/${id}/revoke-sessions`, { method: "POST" }),
};
