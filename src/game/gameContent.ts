import { fetchContentBootstrap, isApiEnabled } from "./apiClient";
import { CHALLENGES } from "./challenges";
import { LEVELS, XP_PER_LEVEL } from "./growth";
import { TITLE_RULES } from "./titles";
import type { Challenge, ContentBootstrap, PublicTitle, UnlockRule } from "./types";

export type GameContentLoadResult = {
  bootstrap: ContentBootstrap;
  source: "local" | "remote";
};

/** 本地兜底称号解锁规则，与 server/scripts/seedContent.ts 保持一致 */
const LOCAL_TITLE_UNLOCK_RULES: Record<string, UnlockRule> = {
  initiate: { type: "always" },
  "first-commit": { type: "complete_challenge", challengeKey: "first-commit" },
  "steady-cultivator": { type: "completed_count", min: 3 },
  "flawless-mind": { type: "perfect_score" },
  "staging-mage": { type: "complete_challenge", challengeKey: "staging-focus" },
  "branch-walker": { type: "complete_challenge", challengeKey: "branch-sword" },
  "merge-adept": { type: "complete_challenge", challengeKey: "merge-river" },
  "timeline-hermit": { type: "complete_challenge", challengeKey: "reset-path" },
  "conflict-lord": { type: "complete_challenge", challengeKey: "conflict-calm" },
  "git-daojun": { type: "complete_all" },
};

/** 本地兜底称号稀有度 */
const LOCAL_TITLE_RARITY: Record<string, string> = {
  initiate: "common",
  "first-commit": "common",
  "steady-cultivator": "rare",
  "flawless-mind": "epic",
  "staging-mage": "common",
  "branch-walker": "common",
  "merge-adept": "rare",
  "timeline-hermit": "rare",
  "conflict-lord": "epic",
  "git-daojun": "legendary",
};

/**
 * 用前端静态文件组装本地内容包。
 * 功能：未配置 API 或离线开发时使用。
 * 参数：无。
 * 返回值：ContentBootstrap。
 */
export const buildLocalGameBootstrap = (): ContentBootstrap => {
  const titles: PublicTitle[] = TITLE_RULES.map((title) => ({
    id: title.id,
    name: title.name,
    flavorText: title.flavorText,
    rarity: LOCAL_TITLE_RARITY[title.id] ?? "common",
    unlockRule: LOCAL_TITLE_UNLOCK_RULES[title.id] ?? { type: "always" },
  }));

  const challenges: Challenge[] = CHALLENGES.map((item) => ({
    ...item,
    version: item.version ?? 1,
  }));

  return {
    challenges,
    titles,
    levels: LEVELS.map((item) => ({ level: item.level, name: item.name })),
    config: {
      xpPerLevel: XP_PER_LEVEL,
      defaultTitleKey: "initiate",
    },
    totalChallenges: challenges.length,
    totalTitles: titles.length,
  };
};

/**
 * 从后端拉取全量游戏内容；未配置 API 时使用本地兜底。
 * 功能：App 启动时一次性加载关卡、称号、等级与全局配置。
 * 参数：fetcher - 可选 fetch，便于测试注入。
 * 返回值：内容包及数据来源。
 */
export const loadGameContent = (fetcher?: typeof fetch): Promise<GameContentLoadResult> => {
  if (!isApiEnabled()) {
    return Promise.resolve({
      bootstrap: buildLocalGameBootstrap(),
      source: "local",
    });
  }

  return fetchContentBootstrap(fetcher).then((bootstrap) => ({
    bootstrap,
    source: "remote" as const,
  }));
};

/**
 * 按 id 查找称号。
 * 功能：顶栏、个人页与结算弹窗展示称号文案。
 * 参数：titles - 称号列表；titleId - 称号 key。
 * 返回值：匹配的称号，找不到时返回列表首项。
 */
export const findTitleById = (titles: PublicTitle[], titleId: string) => {
  return titles.find((item) => item.id === titleId) ?? titles[0];
};

/**
 * 按 id 查找关卡。
 * 功能：路由与练习页定位当前关卡。
 * 参数：challenges - 关卡列表；challengeId - 关卡 id。
 * 返回值：匹配的关卡或 undefined。
 */
export const getChallengeById = (challenges: Challenge[], challengeId: string) => {
  return challenges.find((item) => item.id === challengeId);
};

/**
 * 判断关卡是否因顺序未解锁。
 * 功能：关卡列表页展示锁定状态。
 * 参数：challenges - 有序关卡列表；challenge - 当前关卡；profile - 玩家档案。
 * 返回值：true 表示仍锁定。
 */
export const isChallengeLocked = (
  challenges: Challenge[],
  challenge: Challenge,
  profile: { completedChallengeIds: string[] },
) => {
  const index = challenges.findIndex((item) => item.id === challenge.id);
  if (index <= 0) {
    return false;
  }
  const previousId = challenges[index - 1].id;
  return !profile.completedChallengeIds.includes(previousId);
};
