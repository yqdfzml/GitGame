import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import type { PoolConnection } from "mysql2/promise";
import { getPool, withTransaction } from "../db";
import { DEFAULT_TITLE_KEY } from "../game/titleRules";
import { ApiError } from "../utils/response";

type UserRow = RowDataPacket & {
  id: number;
  email: string;
  display_name: string;
  password_hash: string;
  status: "active" | "disabled";
};

export type PublicUser = {
  id: string;
  email: string;
  displayName: string;
};

type RegisterInput = {
  email: string;
  password: string;
  displayName: string;
};

type LoginInput = {
  email: string;
  password: string;
};

/**
 * 校验注册参数。
 * 功能：拦截明显非法输入。
 * 参数：input - 注册表单。
 * 返回值：无，非法时抛出 ApiError。
 */
const validateRegisterInput = (input: RegisterInput) => {
  if (!input.email.includes("@") || input.email.length > 255) {
    throw new ApiError(400, "VALIDATION_ERROR", "邮箱格式不正确");
  }
  if (input.password.length < 6) {
    throw new ApiError(400, "VALIDATION_ERROR", "密码至少 6 位");
  }
  if (!input.displayName.trim() || input.displayName.length > 64) {
    throw new ApiError(400, "VALIDATION_ERROR", "昵称长度需在 1~64 之间");
  }
};

/**
 * 把数据库用户行转成对外结构。
 * 功能：隐藏 password_hash 等敏感字段。
 * 参数：row - users 表查询结果。
 * 返回值：PublicUser。
 */
const toPublicUser = (row: UserRow): PublicUser => ({
  id: String(row.id),
  email: row.email,
  displayName: row.display_name,
});

/**
 * 注册新用户并初始化玩家档案。
 * 功能：写入 users、player_profiles、默认称号解锁。
 * 参数：input - 注册信息。
 * 返回值：PublicUser。
 */
export const registerUser = async (input: RegisterInput) => {
  validateRegisterInput(input);
  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim();
  const db = getPool();

  const [existingRows] = await db.query<UserRow[]>(
    "SELECT id FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1",
    [email],
  );
  if (existingRows.length > 0) {
    throw new ApiError(409, "EMAIL_ALREADY_EXISTS", "邮箱已注册");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  return withTransaction(async (connection) => {
    const [insertUserResult] = await connection.query(
      "INSERT INTO users (email, password_hash, display_name, status) VALUES (?, ?, ?, 'active')",
      [email, passwordHash, displayName],
    );
    const userId = Number((insertUserResult as { insertId: number }).insertId);

    await connection.query(
      "INSERT INTO player_profiles (user_id, level, total_xp, completed_challenge_count, perfect_challenge_count) VALUES (?, 1, 0, 0, 0)",
      [userId],
    );

    await connection.query(
      "INSERT INTO player_title_unlocks (user_id, title_key) VALUES (?, ?)",
      [userId, DEFAULT_TITLE_KEY],
    );

    const [userRows] = await connection.query<UserRow[]>(
      "SELECT id, email, display_name, password_hash, status FROM users WHERE id = ? LIMIT 1",
      [userId],
    );
    return toPublicUser(userRows[0]);
  });
};

/**
 * 用户登录。
 * 功能：校验邮箱密码并更新 last_login_at。
 * 参数：input - 登录信息。
 * 返回值：PublicUser。
 */
export const loginUser = async (input: LoginInput) => {
  const email = input.email.trim().toLowerCase();
  const db = getPool();
  const [rows] = await db.query<UserRow[]>(
    "SELECT id, email, display_name, password_hash, status FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1",
    [email],
  );

  if (rows.length === 0) {
    throw new ApiError(401, "UNAUTHORIZED", "邮箱或密码错误");
  }

  const user = rows[0];
  if (user.status !== "active") {
    throw new ApiError(403, "FORBIDDEN", "账号已被禁用");
  }

  const matched = await bcrypt.compare(input.password, user.password_hash);
  if (!matched) {
    throw new ApiError(401, "UNAUTHORIZED", "邮箱或密码错误");
  }

  await db.query("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?", [user.id]);
  return toPublicUser(user);
};

/**
 * 根据用户 ID 查询公开信息。
 * 功能：/api/auth/me 使用。
 * 参数：userId - 用户 ID。
 * 返回值：PublicUser。
 */
export const getUserById = async (userId: number) => {
  const db = getPool();
  const [rows] = await db.query<UserRow[]>(
    "SELECT id, email, display_name, password_hash, status FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1",
    [userId],
  );
  if (rows.length === 0) {
    throw new ApiError(404, "USER_NOT_FOUND", "用户不存在");
  }
  return toPublicUser(rows[0]);
};

/**
 * 在事务连接中读取用户，供其他 service 复用。
 * 功能：避免重复查 users。
 * 参数：connection - 事务连接；userId - 用户 ID。
 * 返回值：PublicUser。
 */
export const getUserByIdInTransaction = async (connection: PoolConnection, userId: number) => {
  const [rows] = await connection.query<UserRow[]>(
    "SELECT id, email, display_name, password_hash, status FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1",
    [userId],
  );
  if (rows.length === 0) {
    throw new ApiError(404, "USER_NOT_FOUND", "用户不存在");
  }
  return toPublicUser(rows[0]);
};
