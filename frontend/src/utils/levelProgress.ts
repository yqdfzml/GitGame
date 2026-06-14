import type { LevelSummary } from "../types";
import { TOPIC_CHAPTER_IDS } from "./levelPresentation";

/**
 * 按修炼路径顺序排序关卡。
 * 功能：先按章节主题顺序，再按 sortOrder 排列。
 * 参数：levels - 关卡列表。
 * 返回值：排序后的新数组。
 */
export const sortLevelsByPath = (levels: LevelSummary[]): LevelSummary[] => {
  const chapterOrder = new Map<string, number>();
  TOPIC_CHAPTER_IDS.forEach((chapterId, index) => {
    chapterOrder.set(chapterId, index);
  });

  return [...levels].sort((left, right) => {
    const leftChapter = left.chapterId ? chapterOrder.get(left.chapterId) ?? 99 : 99;
    const rightChapter = right.chapterId ? chapterOrder.get(right.chapterId) ?? 99 : 99;
    if (leftChapter !== rightChapter) {
      return leftChapter - rightChapter;
    }
    return left.sortOrder - right.sortOrder;
  });
};

/**
 * 查找推荐继续的下一关。
 * 功能：优先返回可开始但未完成的关卡，否则返回首个待解锁关卡。
 * 参数：levels - 关卡列表。
 * 返回值：推荐关卡，全部通关时返回 null。
 */
export const findNextRecommendedLevel = (levels: LevelSummary[]): LevelSummary | null => {
  const sortedLevels = sortLevelsByPath(levels);

  const continueLevel = sortedLevels.find(
    (level) => level.unlockStatus !== "completed" && level.canStart,
  );
  if (continueLevel) {
    return continueLevel;
  }

  const lockedLevel = sortedLevels.find((level) => level.unlockStatus === "locked");
  return lockedLevel ?? null;
};

/**
 * 计算全路径通关进度。
 * 功能：统计已完成关卡数与百分比。
 * 参数：levels - 关卡列表。
 * 返回值：completed、total、percent。
 */
export const calcRouteProgress = (levels: LevelSummary[]) => {
  const total = levels.length;
  const completed = levels.filter((level) => level.unlockStatus === "completed").length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return { completed, total, percent };
};

/**
 * 生成关卡锁定原因文案。
 * 功能：告诉用户为什么还不能开始，以及解锁代价。
 * 参数：level - 关卡摘要；balance - 当前积分余额。
 * 返回值：锁定说明字符串。
 */
export const getLevelLockReason = (level: LevelSummary, balance: number): string => {
  if (level.unlockStatus === "completed") {
    return "本关已通关，可重新挑战刷分";
  }

  if (level.canStart) {
    return "已解锁，点击即可开始练习";
  }

  if (level.unlockStatus === "locked") {
    if (balance < level.unlockCost) {
      return `需 ${level.unlockCost} 积分解锁，当前余额 ${balance}，还差 ${level.unlockCost - balance}`;
    }
    return `消耗 ${level.unlockCost} 积分即可解锁本关`;
  }

  return "关卡暂不可开始";
};

/**
 * 判断推荐关卡是否属于“继续练习”类型。
 * 功能：区分主 CTA 是继续还是解锁。
 * 参数：level - 推荐关卡。
 * 返回值：true 表示可直接继续。
 */
export const isContinueLevel = (level: LevelSummary): boolean => {
  return level.unlockStatus !== "completed" && level.canStart;
};
