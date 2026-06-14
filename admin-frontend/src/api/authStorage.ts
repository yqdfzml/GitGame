import type { AuthUser } from "@shared/types";

/** localStorage 中缓存的管理员信息键名，与玩家端隔离 */
const ADMIN_AUTH_USER_KEY = "gitgame_admin_auth_user";

/**
 * 将管理员信息写入 localStorage。
 * 功能：刷新页面后快速恢复展示用的昵称与邮箱。
 * 参数：user - 用户摘要。
 * 返回值：无。
 */
export function saveAuthUser(user: AuthUser): void {
  localStorage.setItem(ADMIN_AUTH_USER_KEY, JSON.stringify(user));
}

/**
 * 从 localStorage 读取管理员信息。
 * 功能：应用启动时先展示缓存，再与服务器校验。
 * 参数：无。
 * 返回值：用户摘要或 null。
 */
export function loadAuthUser(): AuthUser | null {
  const raw = localStorage.getItem(ADMIN_AUTH_USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    localStorage.removeItem(ADMIN_AUTH_USER_KEY);
    return null;
  }
}

/**
 * 清除 localStorage 中的管理员信息。
 * 功能：登出或会话失效时调用。
 * 参数：无。
 * 返回值：无。
 */
export function clearAuthUser(): void {
  localStorage.removeItem(ADMIN_AUTH_USER_KEY);
}
