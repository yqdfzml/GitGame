/** 单关通关基础分默认值（扣除步数惩罚前） */
export const DEFAULT_LEVEL_BASE_SCORE = 30;

/** 旧版单关满分，用于折算历史 levelResult 得分 */
export const LEGACY_LEVEL_BASE_SCORE = 100;

/**
 * 将旧版 100 分制通关得分折算为当前 30 分制。
 * 功能：seed 或数据修复时批量修正历史得分，已在新分制内的记录保持不变。
 * 参数：score - 数据库中的历史得分。
 * 返回值：折算后的得分。
 */
export function convertLegacyPracticeScore(score: number): number {
  if (score <= DEFAULT_LEVEL_BASE_SCORE) {
    return score;
  }
  return Math.max(0, Math.round((score * DEFAULT_LEVEL_BASE_SCORE) / LEGACY_LEVEL_BASE_SCORE));
}

/** 累计得分徽章：第一档门槛 */
export const MASTERY_SCORE_TIER_1 = 100;

/** 累计得分徽章：第二档门槛 */
export const MASTERY_SCORE_TIER_2 = 200;

/** 飞升称号所需累计得分 */
export const TITLE_HIGH_SCORE_THRESHOLD = 120;

/** 全通高分徽章所需累计得分 */
export const FULL_CLEAR_PLUS_SCORE_THRESHOLD = 200;
