import type { RowDataPacket } from "mysql2";
import { getPool } from "../db";
import { getTitleDisplayName } from "../game/titleRules";
import { ApiError } from "../utils/response";

type ProfileRow = RowDataPacket & {
  level: number;
  total_xp: number;
  current_title_key: string | null;
  completed_challenge_count: number;
  perfect_challenge_count: number;
};

type ProgressRow = RowDataPacket & {
  challenge_key: string;
  challenge_version: number;
  status: "started" | "completed";
  best_score: number;
  best_mistake_count: number;
  best_hint_count: number;
  best_in_order: number;
  completed_count: number;
  first_completed_at: string | null;
  last_completed_at: string | null;
};

type TitleUnlockRow = RowDataPacket & {
  title_key: string;
  unlocked_at: string;
};

/**
 * 读取玩家档案摘要。
 * 功能：GET /api/player/profile。
 * 参数：userId - 当前登录用户 ID。
 * 返回值：档案摘要对象。
 */
export const getPlayerProfile = async (userId: number) => {
  const db = getPool();
  const [rows] = await db.query<ProfileRow[]>(
    `SELECT level, total_xp, current_title_key, completed_challenge_count, perfect_challenge_count
     FROM player_profiles
     WHERE user_id = ? AND deleted_at IS NULL
     LIMIT 1`,
    [userId],
  );

  if (rows.length === 0) {
    throw new ApiError(404, "PROFILE_NOT_FOUND", "玩家档案不存在");
  }

  const profile = rows[0];
  const titleKey = profile.current_title_key ?? "initiate";

  return {
    level: profile.level,
    totalXp: profile.total_xp,
    currentTitle: {
      key: titleKey,
      name: getTitleDisplayName(titleKey),
    },
    completedChallengeCount: profile.completed_challenge_count,
    perfectChallengeCount: profile.perfect_challenge_count,
  };
};

/**
 * 读取玩家全部关卡进度。
 * 功能：GET /api/player/challenge-progress，供前端恢复本地存档。
 * 参数：userId - 当前登录用户 ID。
 * 返回值：进度数组。
 */
export const getPlayerChallengeProgress = async (userId: number) => {
  const db = getPool();
  const [rows] = await db.query<ProgressRow[]>(
    `SELECT challenge_key, challenge_version, status, best_score, best_mistake_count,
            best_hint_count, best_in_order, completed_count, first_completed_at, last_completed_at
     FROM player_challenge_progress
     WHERE user_id = ? AND deleted_at IS NULL
     ORDER BY challenge_key ASC`,
    [userId],
  );

  return rows.map((row) => ({
    challengeKey: row.challenge_key,
    challengeVersion: row.challenge_version,
    status: row.status,
    bestScore: row.best_score,
    bestMistakeCount: row.best_mistake_count,
    bestHintCount: row.best_hint_count,
    inOrder: row.best_in_order === 1,
    completedCount: row.completed_count,
    firstCompletedAt: row.first_completed_at,
    lastCompletedAt: row.last_completed_at,
  }));
};

/**
 * 读取玩家已解锁称号。
 * 功能：GET /api/player/titles。
 * 参数：userId - 当前登录用户 ID。
 * 返回值：称号列表。
 */
export const getPlayerTitles = async (userId: number) => {
  const db = getPool();
  const [rows] = await db.query<TitleUnlockRow[]>(
    "SELECT title_key, unlocked_at FROM player_title_unlocks WHERE user_id = ? ORDER BY unlocked_at ASC",
    [userId],
  );

  return rows.map((row) => ({
    key: row.title_key,
    name: getTitleDisplayName(row.title_key),
    unlockedAt: row.unlocked_at,
  }));
};

/**
 * 修改当前展示称号。
 * 功能：PATCH /api/player/current-title。
 * 参数：userId - 用户 ID；titleKey - 目标称号 key。
 * 返回值：更新后的 currentTitle。
 */
export const updateCurrentTitle = async (userId: number, titleKey: string) => {
  const db = getPool();
  const [ownedRows] = await db.query<TitleUnlockRow[]>(
    "SELECT title_key FROM player_title_unlocks WHERE user_id = ? AND title_key = ? LIMIT 1",
    [userId, titleKey],
  );

  if (ownedRows.length === 0) {
    throw new ApiError(404, "TITLE_NOT_FOUND", "称号不存在或未解锁");
  }

  await db.query("UPDATE player_profiles SET current_title_key = ? WHERE user_id = ? AND deleted_at IS NULL", [
    titleKey,
    userId,
  ]);

  return {
    key: titleKey,
    name: getTitleDisplayName(titleKey),
  };
};

/**
 * 读取玩家已解锁称号 key 列表。
 * 功能：通关结算时计算新解锁称号。
 * 参数：userId - 用户 ID。
 * 返回值：title_key 数组。
 */
export const getOwnedTitleKeys = async (userId: number) => {
  const db = getPool();
  const [rows] = await db.query<TitleUnlockRow[]>(
    "SELECT title_key FROM player_title_unlocks WHERE user_id = ? ORDER BY unlocked_at ASC",
    [userId],
  );
  return rows.map((row) => row.title_key);
};
