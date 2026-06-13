import type { RowDataPacket } from "mysql2";
import type { PoolConnection } from "mysql2/promise";
import { withTransaction } from "../db";
import { getChallengeBaseXp, getChallengeVersion, isValidChallengeKey } from "../game/challengeCatalog";
import { calculateEarnedXp, getLevelFromXp, isPerfectScore } from "../game/gameRules";
import { DEFAULT_TITLE_KEY, getNewlyUnlockedTitleKeys, getTitleDisplayName } from "../game/titleRules";
import { ApiError } from "../utils/response";

type ProfileRow = RowDataPacket & {
  id: number;
  level: number;
  total_xp: number;
  current_title_key: string | null;
  completed_challenge_count: number;
  perfect_challenge_count: number;
};

type ProgressRow = RowDataPacket & {
  id: number;
  best_score: number;
  best_mistake_count: number;
  best_hint_count: number;
  best_in_order: number;
  completed_count: number;
  status: "started" | "completed";
};

type TitleUnlockRow = RowDataPacket & {
  title_key: string;
};

export type SubmitAttemptInput = {
  userId: number;
  challengeKey: string;
  challengeVersion: number;
  score: number;
  mistakeCount: number;
  hintCount: number;
  inOrder: boolean;
  commandCount: number;
  durationSeconds?: number;
  commandLog: string[];
};

/**
 * 校验通关提交参数。
 * 功能：拦截非法 score、未知关卡等输入。
 * 参数：input - 前端提交体。
 * 返回值：无，非法时抛出 ApiError。
 */
const validateAttemptInput = (input: SubmitAttemptInput) => {
  if (!isValidChallengeKey(input.challengeKey)) {
    throw new ApiError(404, "CHALLENGE_NOT_FOUND", "关卡不存在或未发布");
  }

  const expectedVersion = getChallengeVersion(input.challengeKey);
  if (input.challengeVersion !== expectedVersion) {
    throw new ApiError(409, "CHALLENGE_VERSION_CONFLICT", "关卡版本不兼容");
  }

  if (input.score < 0 || input.score > 100) {
    throw new ApiError(400, "VALIDATION_ERROR", "score 必须在 0~100 之间");
  }

  if (input.mistakeCount < 0 || input.hintCount < 0 || input.commandCount < 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "统计字段不能为负数");
  }
};

/**
 * 提交关卡完成结果并在事务中结算 XP、进度和称号。
 * 功能：POST /api/player/challenge-attempts 的核心逻辑。
 * 参数：input - 通关结果。
 * 返回值：结算结果。
 */
export const submitChallengeAttempt = async (input: SubmitAttemptInput) => {
  validateAttemptInput(input);

  return withTransaction(async (connection) => {
    const [profileRows] = await connection.query<ProfileRow[]>(
      `SELECT id, level, total_xp, current_title_key, completed_challenge_count, perfect_challenge_count
       FROM player_profiles
       WHERE user_id = ? AND deleted_at IS NULL
       LIMIT 1
       FOR UPDATE`,
      [input.userId],
    );

    if (profileRows.length === 0) {
      throw new ApiError(404, "PROFILE_NOT_FOUND", "玩家档案不存在");
    }

    const profile = profileRows[0];
    const levelBefore = profile.level;

    const [progressRows] = await connection.query<ProgressRow[]>(
      `SELECT id, best_score, best_mistake_count, best_hint_count, best_in_order, completed_count, status
       FROM player_challenge_progress
       WHERE user_id = ? AND challenge_key = ? AND deleted_at IS NULL
       LIMIT 1
       FOR UPDATE`,
      [input.userId, input.challengeKey],
    );

    const existingProgress = progressRows[0];
    const previousBest = existingProgress?.best_score ?? 0;
    const baseXp = getChallengeBaseXp(input.challengeKey);
    const { baseXp: earnedBaseXp, bonusXp: earnedBonusXp } = calculateEarnedXp({
      baseXp,
      previousBest,
      score: input.score,
    });
    const earnedXp = earnedBaseXp + earnedBonusXp;
    const bestScoreUpdated = input.score > previousBest;
    const nextBestScore = Math.max(previousBest, input.score);
    const wasCompletedBefore = existingProgress?.status === "completed";
    const isFirstCompletion = !wasCompletedBefore;

    // 写入本次挑战记录
    await connection.query(
      `INSERT INTO player_challenge_attempts
       (user_id, challenge_key, challenge_version, score, earned_xp, mistake_count, hint_count, in_order, command_count, duration_seconds, command_log)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.userId,
        input.challengeKey,
        input.challengeVersion,
        input.score,
        earnedXp,
        input.mistakeCount,
        input.hintCount,
        input.inOrder ? 1 : 0,
        input.commandCount,
        input.durationSeconds ?? null,
        JSON.stringify(input.commandLog),
      ],
    );

    // 刷新最佳成绩时，同步更新最佳统计；否则保留历史最佳统计
    const nextBestMistakeCount = bestScoreUpdated ? input.mistakeCount : (existingProgress?.best_mistake_count ?? input.mistakeCount);
    const nextBestHintCount = bestScoreUpdated ? input.hintCount : (existingProgress?.best_hint_count ?? input.hintCount);
    const nextBestInOrder = bestScoreUpdated ? (input.inOrder ? 1 : 0) : (existingProgress?.best_in_order ?? (input.inOrder ? 1 : 0));

    if (!existingProgress) {
      await connection.query(
        `INSERT INTO player_challenge_progress
         (user_id, challenge_key, challenge_version, status, best_score, best_mistake_count, best_hint_count, best_in_order, completed_count, first_completed_at, last_completed_at)
         VALUES (?, ?, ?, 'completed', ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          input.userId,
          input.challengeKey,
          input.challengeVersion,
          input.score,
          input.mistakeCount,
          input.hintCount,
          input.inOrder ? 1 : 0,
        ],
      );
    } else {
      await connection.query(
        `UPDATE player_challenge_progress
         SET challenge_version = ?, status = 'completed', best_score = ?, best_mistake_count = ?,
             best_hint_count = ?, best_in_order = ?, completed_count = completed_count + 1,
             first_completed_at = COALESCE(first_completed_at, CURRENT_TIMESTAMP),
             last_completed_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          input.challengeVersion,
          nextBestScore,
          nextBestMistakeCount,
          nextBestHintCount,
          nextBestInOrder,
          existingProgress.id,
        ],
      );
    }

    const nextTotalXp = profile.total_xp + earnedXp;
    const levelAfter = getLevelFromXp(nextTotalXp);
    const nextCompletedCount = profile.completed_challenge_count + (isFirstCompletion ? 1 : 0);
    const nextPerfectCount =
      profile.perfect_challenge_count + (isFirstCompletion && isPerfectScore(input.score) ? 1 : 0);

    await connection.query(
      `UPDATE player_profiles
       SET total_xp = ?, level = ?, completed_challenge_count = ?, perfect_challenge_count = ?
       WHERE id = ?`,
      [nextTotalXp, levelAfter, nextCompletedCount, nextPerfectCount, profile.id],
    );

    const completedChallengeKeys = await loadCompletedChallengeKeys(connection, input.userId, input.challengeKey);
    const ownedTitleKeys = await loadOwnedTitleKeys(connection, input.userId);
    const newlyUnlockedKeys = getNewlyUnlockedTitleKeys(
      {
        completedChallengeKeys,
        completedChallengeCount: nextCompletedCount,
        perfectChallengeCount: nextPerfectCount,
        currentChallengeKey: input.challengeKey,
        currentScore: input.score,
        totalChallengeCount: 6,
      },
      ownedTitleKeys,
    );

    for (const titleKey of newlyUnlockedKeys) {
      await connection.query("INSERT IGNORE INTO player_title_unlocks (user_id, title_key) VALUES (?, ?)", [
        input.userId,
        titleKey,
      ]);
    }

    if (newlyUnlockedKeys.length > 0) {
      const latestTitle = newlyUnlockedKeys[newlyUnlockedKeys.length - 1];
      await connection.query("UPDATE player_profiles SET current_title_key = ? WHERE id = ?", [latestTitle, profile.id]);
    } else if (!profile.current_title_key) {
      await connection.query("UPDATE player_profiles SET current_title_key = ? WHERE id = ?", [
        DEFAULT_TITLE_KEY,
        profile.id,
      ]);
    }

    return {
      earnedXp,
      levelBefore,
      levelAfter,
      bestScoreUpdated,
      unlockedTitles: newlyUnlockedKeys.map((key) => ({
        key,
        name: getTitleDisplayName(key),
      })),
    };
  });
};

/**
 * 读取玩家已完成关卡 key 列表。
 * 功能：称号解锁计算时使用。
 * 参数：connection - 事务连接；userId - 用户 ID；currentKey - 本次刚完成的关卡。
 * 返回值：已完成 challenge_key 数组。
 */
const loadCompletedChallengeKeys = async (
  connection: PoolConnection,
  userId: number,
  currentKey: string,
) => {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT challenge_key
     FROM player_challenge_progress
     WHERE user_id = ? AND status = 'completed' AND deleted_at IS NULL`,
    [userId],
  );
  const keys = rows.map((row) => String(row.challenge_key));
  if (!keys.includes(currentKey)) {
    keys.push(currentKey);
  }
  return keys;
};

/**
 * 读取玩家已解锁称号 key。
 * 功能：避免重复解锁。
 * 参数：connection - 事务连接；userId - 用户 ID。
 * 返回值：title_key 数组。
 */
const loadOwnedTitleKeys = async (connection: PoolConnection, userId: number) => {
  const [rows] = await connection.query<TitleUnlockRow[]>(
    "SELECT title_key FROM player_title_unlocks WHERE user_id = ?",
    [userId],
  );
  return rows.map((row) => row.title_key);
};
