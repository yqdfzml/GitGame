/**
 * API 客户端封装。
 * 功能：统一 fetch 请求，自动携带 Cookie  credentials。
 * 参数：通过各方法传入路径和数据。
 * 返回值：解析后的 JSON 或抛出错误。
 */

/** API 基础路径，开发环境走 Vite 代理 */
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

/** 请求选项 */
interface RequestOptions {
  method?: string;
  body?: unknown;
}

/**
 * 发送 HTTP 请求。
 * 功能：封装 fetch，处理 JSON 和错误响应。
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

  return fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers,
    body,
    credentials: "include",
  }).then((response) => {
    if (!response.ok) {
      return response.json().then((data: { message?: string | string[] }) => {
        const msg = Array.isArray(data.message) ? data.message.join(", ") : data.message;
        throw new Error(msg ?? `请求失败: ${response.status}`);
      });
    }
    return response.json() as Promise<T>;
  });
};

/** 认证 API */
export const authApi = {
  register: (data: { email: string; password: string; displayName: string }) =>
    request<{ user: { id: string; email: string; displayName: string; role: string } }>(
      "/auth/register",
      { method: "POST", body: data },
    ),
  login: (data: { email: string; password: string }) =>
    request<{ user: { id: string; email: string; displayName: string; role: string } }>(
      "/auth/login",
      { method: "POST", body: data },
    ),
  logout: () => request<{ message: string }>("/auth/logout", { method: "POST" }),
  me: () => request<{ user: { sub: string; role: string } }>("/auth/me", { method: "POST" }),
};

/** 关卡 API */
export const levelsApi = {
  list: () => request<import("./types").LevelSummary[]>("/levels"),
  get: (id: string) =>
    request<{
      id: string;
      title: string;
      description: string;
      initialState: import("./types").RepoState;
      goalHints: string[];
    }>(`/levels/${id}`),
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
      commands: import("./types").CommandEntry[];
      snapshots: Array<{ stepIndex: number; state: import("./types").RepoState }>;
    }>(`/attempts/${id}/replay`),
};

/** 排行榜 API */
export const leaderboardApi = {
  list: (levelId?: string) =>
    request<import("./types").LeaderboardEntry[]>(
      levelId ? `/leaderboard?levelId=${levelId}` : "/leaderboard",
    ),
};

/** 用户 API */
export const usersApi = {
  stats: () =>
    request<{ completedLevelCount: number; totalScore: number }>("/users/me/stats"),
};

/** 管理 API */
export const adminApi = {
  createLevel: (data: Record<string, unknown>) =>
    request<{ id: string }>("/admin/levels", { method: "POST", body: data }),
  publishLevel: (id: string) =>
    request<{ id: string; status: string }>(`/admin/levels/${id}/publish`, { method: "POST" }),
};
