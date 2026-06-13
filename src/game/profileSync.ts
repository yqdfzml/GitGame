import { getLevelFromXp } from "./growth";
import {
  fetchChallengeProgress,
  fetchPlayerProfile,
  fetchPlayerTitles,
} from "./apiClient";
import type { BackendChallengeProgress, PlayerProfile } from "./types";

type PullCloudProfileInput = {
  accessToken: string;
  fetcher?: typeof fetch;
};

/**
 * 把云端关卡进度转成前端 bestScores 和 completedChallengeIds。
 * 功能：恢复本地 PlayerProfile 所需字段。
 * 参数：progressList - 后端进度数组。
 * 返回值：bestScores 与 completedChallengeIds。
 */
const mapProgressToLocal = (progressList: BackendChallengeProgress[]) => {
  const bestScores: Record<string, number> = {};
  const completedChallengeIds: string[] = [];

  for (const item of progressList) {
    bestScores[item.challengeKey] = item.bestScore;
    if (item.status === "completed") {
      completedChallengeIds.push(item.challengeKey);
    }
  }

  return { bestScores, completedChallengeIds };
};

/**
 * 从云端拉取玩家档案并映射为本地 PlayerProfile。
 * 功能：登录后恢复多设备进度。
 * 参数：input - accessToken 和可选 fetcher。
 * 返回值：合并后的 PlayerProfile。
 */
export const pullCloudProfile = ({ accessToken, fetcher }: PullCloudProfileInput): Promise<PlayerProfile> => {
  return Promise.all([
    fetchPlayerProfile(accessToken, fetcher),
    fetchChallengeProgress(accessToken, fetcher),
    fetchPlayerTitles(accessToken, fetcher),
  ]).then(([profile, progressList, titles]) => {
    const { bestScores, completedChallengeIds } = mapProgressToLocal(progressList);
    const unlockedTitleIds = titles.map((title) => title.key);
    const totalScore = Object.values(bestScores).reduce((sum, score) => sum + score, 0);

    return {
      level: profile.level,
      xp: profile.totalXp,
      totalScore,
      activeTitleId: profile.currentTitle.key,
      unlockedTitleIds: unlockedTitleIds.length > 0 ? unlockedTitleIds : ["initiate"],
      completedChallengeIds,
      bestScores,
    };
  });
};

/**
 * 合并本地档案与云端档案，取更优进度。
 * 功能：避免本地较新进度被旧云端数据覆盖。
 * 参数：localProfile - 本地档案；cloudProfile - 云端档案。
 * 返回值：合并后的 PlayerProfile。
 */
export const mergeProfilesPreferHigher = (localProfile: PlayerProfile, cloudProfile: PlayerProfile): PlayerProfile => {
  const challengeIds = new Set([...localProfile.completedChallengeIds, ...cloudProfile.completedChallengeIds]);
  const bestScores = { ...cloudProfile.bestScores };

  for (const [challengeId, localScore] of Object.entries(localProfile.bestScores)) {
    bestScores[challengeId] = Math.max(bestScores[challengeId] ?? 0, localScore);
  }

  const unlockedTitleIds = Array.from(
    new Set([...localProfile.unlockedTitleIds, ...cloudProfile.unlockedTitleIds]),
  );
  const xp = Math.max(localProfile.xp, cloudProfile.xp);

  return {
    level: getLevelFromXp(xp),
    xp,
    totalScore: Object.values(bestScores).reduce((sum, score) => sum + score, 0),
    activeTitleId: cloudProfile.xp >= localProfile.xp ? cloudProfile.activeTitleId : localProfile.activeTitleId,
    unlockedTitleIds,
    completedChallengeIds: Array.from(challengeIds),
    bestScores,
  };
};
