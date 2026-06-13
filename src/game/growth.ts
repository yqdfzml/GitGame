import { CHALLENGES } from "./challenges";
import type { Challenge, ChallengeResult, LevelInfo, PlayerProfile } from "./types";
import { TITLE_RULES } from "./titles";

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

export const createInitialProfile = (): PlayerProfile => ({
  level: 1,
  xp: 0,
  totalScore: 0,
  activeTitleId: "initiate",
  unlockedTitleIds: ["initiate"],
  completedChallengeIds: [],
  bestScores: {},
});

export const getLevelFromXp = (xp: number) =>
  Math.min(LEVELS.length, Math.floor(Math.max(0, xp) / XP_PER_LEVEL) + 1);

export const getLevelInfo = (level: number) =>
  LEVELS.find((item) => item.level === level) ?? LEVELS[0];

export const getLevelProgress = (xp: number) => {
  const level = getLevelFromXp(xp);
  if (level >= LEVELS.length) {
    return { current: XP_PER_LEVEL, required: XP_PER_LEVEL, percent: 100 };
  }

  const current = Math.max(0, xp) % XP_PER_LEVEL;
  return { current, required: XP_PER_LEVEL, percent: Math.round((current / XP_PER_LEVEL) * 100) };
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

export const applyChallengeResult = (
  profile: PlayerProfile,
  result: ChallengeResult,
  allChallenges: Challenge[] = CHALLENGES,
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

  const newlyUnlocked = TITLE_RULES.filter(
    (rule) =>
      !provisionalProfile.unlockedTitleIds.includes(rule.id) &&
      rule.unlockCondition(provisionalProfile, result, allChallenges),
  ).map((rule) => rule.id);

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
