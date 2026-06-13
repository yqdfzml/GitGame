import type { AuthSession, AuthUser } from "./types";

const ACCESS_TOKEN_KEY = "gitgame.access-token.v1";
const AUTH_USER_KEY = "gitgame.auth-user.v1";

/**
 * 读取本地保存的 access token。
 * 功能：云同步和受保护 API 调用时使用。
 * 参数：无。
 * 返回值：token 字符串或 null。
 */
export const loadAccessToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
};

/**
 * 读取本地保存的用户信息。
 * 功能：个人中心展示登录态。
 * 参数：无。
 * 返回值：AuthUser 或 null。
 */
export const loadAuthUser = (): AuthUser | null => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
};

/**
 * 保存登录会话。
 * 功能：注册/登录成功后写入 localStorage。
 * 参数：session - token 和 user。
 * 返回值：无。
 */
export const saveAuthSession = (session: AuthSession) => {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(session.user));
};

/**
 * 清除登录会话。
 * 功能：登出时使用。
 * 参数：无。
 * 返回值：无。
 */
export const clearAuthSession = () => {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
};

/**
 * 读取完整登录会话。
 * 功能：应用启动时恢复登录态。
 * 参数：无。
 * 返回值：AuthSession 或 null。
 */
export const loadAuthSession = (): AuthSession | null => {
  const accessToken = loadAccessToken();
  const user = loadAuthUser();
  if (!accessToken || !user) return null;
  return { accessToken, user };
};
