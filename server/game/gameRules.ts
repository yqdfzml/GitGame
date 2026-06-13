/**
 * 服务端成长规则，需与 src/game/growth.ts 保持同步。
 */

export const XP_PER_LEVEL = 100;
export const MAX_LEVEL = 10;

/**
 * 根据总 XP 计算等级。
 * 功能：写入 player_profiles.level 时使用。
 * 参数：totalXp - 玩家累计 XP。
 * 返回值：1~10 的等级。
 */
export const getLevelFromXp = (totalXp: number) => {
  return Math.min(MAX_LEVEL, Math.floor(Math.max(0, totalXp) / XP_PER_LEVEL) + 1);
};

/**
 * 计算精进奖励 XP。
 * 功能：首次通关或刷新最佳成绩时追加奖励。
 * 参数：score - 本次得分。
 * 返回值：奖励 XP。
 */
export const calculateBonusXp = (score: number) => {
  if (score >= 100) return 20;
  if (score >= 90) return 12;
  if (score >= 80) return 6;
  return 0;
};

type EarnedXpInput = {
  baseXp: number;
  previousBest: number;
  score: number;
};

/**
 * 计算本次应获得的 XP。
 * 功能：服务端不信任前端 earnedXp，按规则自行结算。
 * 参数：input - 关卡基础 XP、历史最佳分和本次得分。
 * 返回值：baseXp 与 bonusXp。
 */
export const calculateEarnedXp = ({ baseXp, previousBest, score }: EarnedXpInput) => {
  // 没有刷新最佳成绩时不发 XP
  if (score <= previousBest) {
    return { baseXp: 0, bonusXp: 0 };
  }

  const improvementRatio = previousBest === 0 ? 1 : (score - previousBest) / 100;
  const earnedBaseXp = Math.round(baseXp * improvementRatio);
  const earnedBonusXp =
    previousBest === 0
      ? calculateBonusXp(score)
      : Math.round(calculateBonusXp(score) * improvementRatio);

  return { baseXp: earnedBaseXp, bonusXp: earnedBonusXp };
};

/**
 * 判断是否为满分通关。
 * 功能：统计 perfect_challenge_count。
 * 参数：score - 本次得分。
 * 返回值：true 表示满分。
 */
export const isPerfectScore = (score: number) => score >= 100;
