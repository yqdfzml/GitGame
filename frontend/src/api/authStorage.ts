import type { AuthUser } from "../types";

/** localStorage 中缓存的用户信息键名 */
const AUTH_USER_KEY = "gitgame_auth_user";

/**
 * 将用户信息写入 localStorage。
 * 功能：刷新页面后快速恢复展示用的昵称与邮箱。
 * 参数：user - 用户摘要。
 * 返回值：无。
 */
export function saveAuthUser(user: AuthUser): void {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

/**
 * 从 localStorage 读取用户信息。
 * 功能：应用启动时先展示缓存，再与服务器校验。
 * 参数：无。
 * 返回值：用户摘要或 null。
 */
export function loadAuthUser(): AuthUser | null {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
}

/**
 * 清除 localStorage 中的用户信息。
 * 功能：登出或会话失效时调用。
 * 参数：无。
 * 返回值：无。
 */
export function clearAuthUser(): void {
  localStorage.removeItem(AUTH_USER_KEY);
}
