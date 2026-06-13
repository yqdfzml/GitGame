import { CHALLENGES } from "./challenges";
import { LEVELS, XP_PER_LEVEL } from "./growth";
import type { Challenge, ChallengeResult, LevelInfo, PlayerProfile, PublicTitle } from "./types";
import { evaluateUnlockRule } from "./unlockRule";

export const XP_PER_LEVEL = 100;

export const LEVELS: LevelInfo[] = [
  { level: 1, name: "Git Rookie" },
  { level: 2, name: "Repo Explorer" },
  { level: 3, name: "Commit Crafter" },
  { level: 4, name: "Branch Navigator" },
  { level: 5, name: "Merge Operator" },
  { level: 6, name: "History Keeper" },
  { level: 7, name: "Conflict Resolver" },
  { level: 8, name: "Workflow Engineer" },
  { level: 9, name: "Release Captain" },
  { level: 10, name: "Git Architect" },
];

// 运行时等级表，启动时由 configureGameContent 注入
let runtimeLevels: LevelInfo[] = LEVELS.map((item) => ({ level: item.level, name: item.name }));
// 运行时每级经验值
let runtimeXpPerLevel = XP_PER_LEVEL;
// 运行时默认称号 key
let runtimeDefaultTitleKey = "initiate";
// 运行时称号目录
let runtimeTitles: PublicTitle[] = [];

/**
 * 注入后端或本地内容包中的成长规则。
 * 功能：App 加载 bootstrap 后调用，使等级与称号解锁与服务端一致。
 * 参数：input - 等级表、经验值步长、默认称号与称号目录。
 * 返回值：无。
 */
export const configureGameContent = (input: {
  levels: LevelInfo[];
  xpPerLevel: number;
  defaultTitleKey: string;
  titles: PublicTitle[];
}) => {
  runtimeLevels = input.levels.length > 0 ? input.levels : LEVELS;
  runtimeXpPerLevel = input.xpPerLevel;
  runtimeDefaultTitleKey = input.defaultTitleKey;
  runtimeTitles = input.titles;
};

/**
 * 读取当前运行时称号目录。
 * 功能：测试或未传 titles 参数时的兜底。
 * 参数：无。
 * 返回值：称号数组。
 */
export const getRuntimeTitles = () => runtimeTitles;

export const createInitialProfile = (): PlayerProfile => ({
  level: 1,
  xp: 0,
  totalScore: 0,
  activeTitleId: runtimeDefaultTitleKey,
  unlockedTitleIds: [runtimeDefaultTitleKey],
  completedChallengeIds: [],
  bestScores: {},
});

export const getLevelFromXp = (xp: number) => {
  const maxLevel = runtimeLevels.length > 0 ? runtimeLevels[runtimeLevels.length - 1].level : 10;
  return Math.min(maxLevel, Math.floor(Math.max(0, xp) / runtimeXpPerLevel) + 1);
};

export const getLevelInfo = (level: number) =>
  runtimeLevels.find((item) => item.level === level) ?? runtimeLevels[0] ?? { level: 1, name: "Git Rookie" };

export const getLevelProgress = (xp: number) => {
  const level = getLevelFromXp(xp);
  const maxLevel = runtimeLevels.length > 0 ? runtimeLevels[runtimeLevels.length - 1].level : 10;
  if (level >= maxLevel) {
    return { current: runtimeXpPerLevel, required: runtimeXpPerLevel, percent: 100 };
  }

  const current = Math.max(0, xp) % runtimeXpPerLevel;
  return {
    current,
    required: runtimeXpPerLevel,
    percent: Math.round((current / runtimeXpPerLevel) * 100),
  };
};

export const calculateScore = (mistakeCount: number, hintCount: number, inOrder: boolean) => {
  const mistakeBonus = Math.max(0, 15 - mistakeCount * 5);
  const hintBonus = Math.max(0, 10 - hintCount * 5);
  const orderBonus = inOrder ? 5 : 0;
  return Math.min(100, 70 + mistakeBonus + hintBonus + orderBonus);
};

export const calculateBonusXp = (score: number) => {
  if (score >= 100) return 20;
  if (score >= 90) return 12;
  if (score >= 80) return 6;
  return 0;
};

const getEarnedXp = (
  profile: PlayerProfile,
  challenge: Challenge,
  score: number,
) => {
  const previousBest = profile.bestScores[challenge.id] ?? 0;
  if (score <= previousBest) return { baseXp: 0, bonusXp: 0 };

  const improvementRatio = previousBest === 0 ? 1 : (score - previousBest) / 100;
  const baseXp = Math.round(challenge.baseXp * improvementRatio);
  const bonusXp = previousBest === 0 ? calculateBonusXp(score) : Math.round(calculateBonusXp(score) * improvementRatio);
  return { baseXp, bonusXp };
};

type CreateChallengeResultInput = {
  profile: PlayerProfile;
  challenge: Challenge;
  mistakeCount: number;
  hintCount: number;
  inOrder: boolean;
  commandCount?: number;
};

export const createChallengeResult = ({
  profile,
  challenge,
  commandCount,
  mistakeCount,
  hintCount,
  inOrder,
}: CreateChallengeResultInput): ChallengeResult => {
  const score = calculateScore(mistakeCount, hintCount, inOrder);
  const { baseXp, bonusXp } = getEarnedXp(profile, challenge, score);

  return {
    challengeId: challenge.id,
    score,
    baseXp,
    bonusXp,
    mistakeCount,
    hintCount,
    inOrder,
    commandCount: commandCount ?? challenge.commands.length,
    completedAt: new Date().toISOString(),
  };
};

type ApplyChallengeResultOptions = {
  allChallenges: Challenge[];
  titles: PublicTitle[];
};

/**
 * 把通关结果合并进玩家档案，并按 JSON 规则解锁称号。
 * 功能：游客模式本地结算；登录用户同步失败时的兜底。
 * 参数：profile - 当前档案；result - 本关结果；options - 关卡与称号目录。
 * 返回值：更新后的档案与新解锁称号 id 列表。
 */
export const applyChallengeResult = (
  profile: PlayerProfile,
  result: ChallengeResult,
  options: ApplyChallengeResultOptions,
) => {
  const nextBest = Math.max(profile.bestScores[result.challengeId] ?? 0, result.score);
  const bestScores = { ...profile.bestScores, [result.challengeId]: nextBest };
  const completedChallengeIds = profile.completedChallengeIds.includes(result.challengeId)
    ? profile.completedChallengeIds
    : [...profile.completedChallengeIds, result.challengeId];

  const xp = profile.xp + result.baseXp + result.bonusXp;
  const totalScore = Object.values(bestScores).reduce((sum, score) => sum + score, 0);
  const provisionalProfile: PlayerProfile = {
    ...profile,
    xp,
    totalScore,
    level: getLevelFromXp(xp),
    completedChallengeIds,
    bestScores,
  };

  const allChallengeKeys = options.allChallenges.map((item) => item.id);
  const perfectChallengeCount = Object.values(bestScores).filter((score) => score >= 100).length;
  const ruleContext = {
    completedChallengeKeys: completedChallengeIds,
    completedChallengeCount: completedChallengeIds.length,
    perfectChallengeCount,
    currentChallengeKey: result.challengeId,
    currentScore: result.score,
    allChallengeKeys,
  };

  const titleRules = options.titles.length > 0 ? options.titles : runtimeTitles;
  const newlyUnlocked = titleRules
    .filter(
      (title) =>
        !provisionalProfile.unlockedTitleIds.includes(title.id) &&
        evaluateUnlockRule(title.unlockRule, ruleContext),
    )
    .map((title) => title.id);

  const unlockedTitleIds = [...provisionalProfile.unlockedTitleIds, ...newlyUnlocked];
  return {
    profile: {
      ...provisionalProfile,
      unlockedTitleIds,
      activeTitleId: newlyUnlocked.at(-1) ?? provisionalProfile.activeTitleId,
    },
    newlyUnlocked,
  };
};
