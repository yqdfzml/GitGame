import type {
  ApiErrorResponse,
  AuthSession,
  BackendChallengeProgress,
  BackendPlayerProfile,
  BackendTitle,
  ChallengeAttemptPayload,
  ChallengeAttemptResult,
} from "./types";

type ApiRequestOptions = {
  method?: "GET" | "POST" | "PATCH";
  accessToken?: string | null;
  body?: unknown;
  fetcher?: typeof fetch;
  apiBaseUrl?: string | null;
};

/**
 * 读取 API 基础地址。
 * 功能：未配置 VITE_API_BASE_URL 时表示后端未启用；空字符串表示同源代理。
 * 参数：无。
 * 返回值：null 表示未启用，string 表示基础地址（可为空字符串）。
 */
export const getApiBaseUrl = (): string | null => {
  const meta = import.meta as ImportMeta & { env?: Record<string, string | undefined> };
  const raw = meta.env?.VITE_API_BASE_URL;
  if (raw === undefined) {
    return null;
  }
  return raw;
};

/**
 * 判断后端 API 是否已配置。
 * 功能：UI 和同步逻辑据此决定是否展示云存档能力。
 * 参数：无。
 * 返回值：true 表示已配置。
 */
export const isApiEnabled = () => getApiBaseUrl() !== null;

/**
 * 拼接完整 API URL。
 * 功能：支持相对路径（Vite 代理）和绝对路径。
 * 参数：path - 以 / 开头的 API 路径；overrideBaseUrl - 可选覆盖基础地址。
 * 返回值：完整请求地址。
 */
const buildApiUrl = (path: string, overrideBaseUrl?: string | null) => {
  const baseUrl = overrideBaseUrl !== undefined ? overrideBaseUrl : getApiBaseUrl();
  if (baseUrl === null) {
    return path;
  }
  const normalizedBase = baseUrl.replace(/\/$/, "");
  return normalizedBase ? `${normalizedBase}${path}` : path;
};

/**
 * 发送 JSON API 请求。
 * 功能：统一处理 Authorization、错误码和响应结构。
 * 参数：path - API 路径；options - 请求配置。
 * 返回值：解析后的 data 字段。
 */
export const apiRequest = <T>(path: string, options: ApiRequestOptions = {}): Promise<T> => {
  const fetcher = options.fetcher ?? fetch;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }

  return fetcher(buildApiUrl(path, options.apiBaseUrl), {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  }).then((response) => {
    return response.json().then((body: { data?: T; error?: ApiErrorResponse["error"] }) => {
      if (!response.ok) {
        const message = body.error?.message ?? "请求失败";
        throw new Error(message);
      }
      return body.data as T;
    });
  });
};

/**
 * 用户注册。
 * 功能：POST /api/auth/register。
 * 参数：email/password/displayName - 注册信息；fetcher - 可选 fetch 替身。
 * 返回值：登录会话（token + user）。
 */
export const registerAccount = (
  email: string,
  password: string,
  displayName: string,
  fetcher?: typeof fetch,
): Promise<AuthSession> => {
  return apiRequest<AuthSession>("/api/auth/register", {
    method: "POST",
    body: { email, password, displayName },
    fetcher,
  });
};

/**
 * 用户登录。
 * 功能：POST /api/auth/login。
 * 参数：email/password - 登录信息；fetcher - 可选 fetch 替身。
 * 返回值：登录会话。
 */
export const loginAccount = (
  email: string,
  password: string,
  fetcher?: typeof fetch,
): Promise<AuthSession> => {
  return apiRequest<AuthSession>("/api/auth/login", {
    method: "POST",
    body: { email, password },
    fetcher,
  });
};

/**
 * 读取当前登录用户。
 * 功能：GET /api/auth/me。
 * 参数：accessToken - 访问令牌；fetcher - 可选 fetch 替身。
 * 返回值：用户信息。
 */
export const fetchCurrentUser = (
  accessToken: string,
  fetcher?: typeof fetch,
): Promise<{ user: AuthSession["user"] }> => {
  return apiRequest<{ user: AuthSession["user"] }>("/api/auth/me", {
    accessToken,
    fetcher,
  });
};

/**
 * 读取云端玩家档案。
 * 功能：GET /api/player/profile。
 * 参数：accessToken - 访问令牌；fetcher - 可选 fetch 替身。
 * 返回值：后端档案摘要。
 */
export const fetchPlayerProfile = (
  accessToken: string,
  fetcher?: typeof fetch,
): Promise<BackendPlayerProfile> => {
  return apiRequest<BackendPlayerProfile>("/api/player/profile", {
    accessToken,
    fetcher,
  });
};

/**
 * 读取云端关卡进度。
 * 功能：GET /api/player/challenge-progress。
 * 参数：accessToken - 访问令牌；fetcher - 可选 fetch 替身。
 * 返回值：关卡进度数组。
 */
export const fetchChallengeProgress = (
  accessToken: string,
  fetcher?: typeof fetch,
): Promise<BackendChallengeProgress[]> => {
  return apiRequest<BackendChallengeProgress[]>("/api/player/challenge-progress", {
    accessToken,
    fetcher,
  });
};

/**
 * 读取云端已解锁称号。
 * 功能：GET /api/player/titles。
 * 参数：accessToken - 访问令牌；fetcher - 可选 fetch 替身。
 * 返回值：称号列表。
 */
export const fetchPlayerTitles = (accessToken: string, fetcher?: typeof fetch): Promise<BackendTitle[]> => {
  return apiRequest<BackendTitle[]>("/api/player/titles", {
    accessToken,
    fetcher,
  });
};

/**
 * 更新当前展示称号。
 * 功能：PATCH /api/player/current-title。
 * 参数：accessToken - 令牌；titleKey - 称号 key；fetcher - 可选 fetch 替身。
 * 返回值：更新后的 currentTitle。
 */
export const updateCurrentTitle = (
  accessToken: string,
  titleKey: string,
  fetcher?: typeof fetch,
): Promise<{ currentTitle: { key: string; name: string } }> => {
  return apiRequest<{ currentTitle: { key: string; name: string } }>("/api/player/current-title", {
    method: "PATCH",
    accessToken,
    body: { titleKey },
    fetcher,
  });
};

/**
 * 提交关卡完成结果。
 * 功能：POST /api/player/challenge-attempts。
 * 参数：accessToken - 令牌；payload - 通关数据；fetcher - 可选 fetch 替身。
 * 返回值：服务端结算结果。
 */
export const submitChallengeAttempt = (
  accessToken: string,
  payload: ChallengeAttemptPayload,
  fetcher?: typeof fetch,
  apiBaseUrl?: string | null,
): Promise<ChallengeAttemptResult> => {
  return apiRequest<ChallengeAttemptResult>("/api/player/challenge-attempts", {
    method: "POST",
    accessToken,
    body: payload,
    fetcher,
    apiBaseUrl,
  });
};
