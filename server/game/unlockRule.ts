/** 称号解锁规则 JSON 结构，与数据库 titles.unlock_rule 字段一致 */

export type UnlockRule =
  | { type: "always" }
  | { type: "complete_challenge"; challengeKey: string }
  | { type: "completed_count"; min: number }
  | { type: "perfect_score" }
  | { type: "complete_all" };

/** 解锁规则评估所需的玩家上下文 */
export type UnlockRuleContext = {
  completedChallengeKeys: string[];
  completedChallengeCount: number;
  perfectChallengeCount: number;
  currentChallengeKey: string;
  currentScore: number;
  allChallengeKeys: string[];
};

/**
 * 根据 JSON 解锁规则判断称号是否满足解锁条件。
 * 功能：服务端与前端共用同一套 declarative 规则。
 * 参数：rule - 解锁规则；context - 当前进度上下文。
 * 返回值：true 表示满足解锁条件。
 */
export const evaluateUnlockRule = (rule: UnlockRule, context: UnlockRuleContext) => {
  if (rule.type === "always") {
    return true;
  }

  if (rule.type === "complete_challenge") {
    return context.currentChallengeKey === rule.challengeKey;
  }

  if (rule.type === "completed_count") {
    return context.completedChallengeCount >= rule.min;
  }

  if (rule.type === "perfect_score") {
    return context.currentScore >= 100;
  }

  if (rule.type === "complete_all") {
    return rule.type === "complete_all" && context.allChallengeKeys.every((key) => context.completedChallengeKeys.includes(key));
  }

  return false;
};
