/**
 * 第一阶段关卡仍由前端维护，后端只保存稳定 challenge_key 并做基础校验。
 * 这里的 baseXp 必须和 src/game/challenges.ts 保持一致。
 */
export const CHALLENGE_CATALOG: Record<string, { baseXp: number; version: number }> = {
  "first-commit": { baseXp: 40, version: 1 },
  "staging-focus": { baseXp: 35, version: 1 },
  "branch-sword": { baseXp: 50, version: 1 },
  "merge-river": { baseXp: 55, version: 1 },
  "reset-path": { baseXp: 60, version: 1 },
  "conflict-calm": { baseXp: 70, version: 1 },
};

/**
 * 判断关卡 key 是否合法。
 * 功能：提交通关结果前校验 challengeKey。
 * 参数：challengeKey - 前端传来的关卡标识。
 * 返回值：true 表示合法。
 */
export const isValidChallengeKey = (challengeKey: string) => {
  return Object.prototype.hasOwnProperty.call(CHALLENGE_CATALOG, challengeKey);
};

/**
 * 读取关卡基础 XP。
 * 功能：服务端计算 earnedXp 时使用。
 * 参数：challengeKey - 关卡标识。
 * 返回值：基础 XP 数值。
 */
export const getChallengeBaseXp = (challengeKey: string) => {
  return CHALLENGE_CATALOG[challengeKey]?.baseXp ?? 0;
};

/**
 * 读取关卡版本。
 * 功能：写入 attempts / progress 时使用。
 * 参数：challengeKey - 关卡标识。
 * 返回值：版本号，未知关卡返回 1。
 */
export const getChallengeVersion = (challengeKey: string) => {
  return CHALLENGE_CATALOG[challengeKey]?.version ?? 1;
};
