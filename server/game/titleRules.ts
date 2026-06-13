/**
 * 称号解锁规则，需与 src/game/titles.ts 保持同步。
 * 服务端只保存 title_key，展示名称仍以前端 TITLE_RULES 为准。
 */

export type TitleUnlockContext = {
  completedChallengeKeys: string[];
  completedChallengeCount: number;
  perfectChallengeCount: number;
  currentChallengeKey: string;
  currentScore: number;
  totalChallengeCount: number;
};

type TitleRule = {
  key: string;
  unlock: (context: TitleUnlockContext) => boolean;
};

const ALL_CHALLENGE_KEYS = [
  "first-commit",
  "staging-focus",
  "branch-sword",
  "merge-river",
  "reset-path",
  "conflict-calm",
];

export const TITLE_RULES: TitleRule[] = [
  { key: "initiate", unlock: () => true },
  { key: "first-commit", unlock: (ctx) => ctx.currentChallengeKey === "first-commit" },
  { key: "steady-cultivator", unlock: (ctx) => ctx.completedChallengeCount >= 3 },
  { key: "flawless-mind", unlock: (ctx) => ctx.currentScore === 100 },
  { key: "staging-mage", unlock: (ctx) => ctx.currentChallengeKey === "staging-focus" },
  { key: "branch-walker", unlock: (ctx) => ctx.currentChallengeKey === "branch-sword" },
  { key: "merge-adept", unlock: (ctx) => ctx.currentChallengeKey === "merge-river" },
  { key: "timeline-hermit", unlock: (ctx) => ctx.currentChallengeKey === "reset-path" },
  { key: "conflict-lord", unlock: (ctx) => ctx.currentChallengeKey === "conflict-calm" },
  {
    key: "git-daojun",
    unlock: (ctx) => ALL_CHALLENGE_KEYS.every((key) => ctx.completedChallengeKeys.includes(key)),
  },
];

export const DEFAULT_TITLE_KEY = "initiate";

/**
 * 计算本次新解锁的称号 key 列表。
 * 功能：通关结算事务中调用，结果幂等写入 player_title_unlocks。
 * 参数：context - 当前玩家进度与本次通关上下文；ownedTitleKeys - 已解锁称号。
 * 返回值：新解锁的 title_key 数组。
 */
export const getNewlyUnlockedTitleKeys = (context: TitleUnlockContext, ownedTitleKeys: string[]) => {
  const ownedSet = new Set(ownedTitleKeys);
  const newlyUnlocked: string[] = [];

  for (const rule of TITLE_RULES) {
    if (ownedSet.has(rule.key)) continue;
    if (rule.unlock(context)) {
      newlyUnlocked.push(rule.key);
      ownedSet.add(rule.key);
    }
  }

  return newlyUnlocked;
};

/**
 * 读取称号展示名。
 * 功能：API 返回 unlockedTitles 时使用。
 * 参数：titleKey - 称号标识。
 * 返回值：展示名称。
 */
export const getTitleDisplayName = (titleKey: string) => {
  const names: Record<string, string> = {
    initiate: "初入仓门",
    "first-commit": "一念成 Commit",
    "steady-cultivator": "稳态修士",
    "flawless-mind": "无瑕剑心",
    "staging-mage": "暂存术士",
    "branch-walker": "分支行者",
    "merge-adept": "合流真人",
    "timeline-hermit": "回溯道人",
    "conflict-lord": "冲突调停真君",
    "git-daojun": "Git 道君",
  };
  return names[titleKey] ?? titleKey;
};
