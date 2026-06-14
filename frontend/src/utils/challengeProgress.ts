import type { JudgeResult } from "../types";

/**
 * 统计本轮新达成的目标项数量。
 * 功能：对比开局 baseline，只统计玩家新满足的 satisfied key。
 * 参数：judge - 当前判题结果；initialSatisfiedKeys - 开局已满足的 key 列表。
 * 返回值：新达成项数量（非负整数）。
 */
export function calcNewlySatisfiedCount(
  judge: JudgeResult,
  initialSatisfiedKeys: string[],
): number {
  return judge.satisfied.filter((key) => !initialSatisfiedKeys.includes(key)).length;
}

/**
 * 计算关卡目标项总数。
 * 功能：总局内项 = 开局已满足 + 开局待完成，避免观察型关卡出现 0/0。
 * 参数：judge - 当前判题结果；initialGapCount - 开局差距项数量；initialSatisfiedKeys - 开局已满足 key。
 * 返回值：目标项总数（至少为 1，当存在判题项时）。
 */
export function calcTotalGoalCount(
  judge: JudgeResult,
  initialGapCount: number,
  initialSatisfiedKeys: string[] = [],
): number {
  const baselineTotal = initialGapCount + initialSatisfiedKeys.length;
  if (baselineTotal > 0) {
    return baselineTotal;
  }
  const currentTotal = judge.satisfied.length + judge.gaps.length;
  return currentTotal > 0 ? currentTotal : 0;
}

/**
 * 计算本轮已完成的目标项数量。
 * 功能：与进度百分比共用同一套分子逻辑，供 UI 展示 x/y 项。
 * 参数：judge - 当前判题结果；initialGapCount - 开局差距项数量；initialSatisfiedKeys - 开局已满足 key。
 * 返回值：已完成项数量。
 */
export function calcResolvedCount(
  judge: JudgeResult,
  initialGapCount: number,
  initialSatisfiedKeys: string[] = [],
): number {
  const total = calcTotalGoalCount(judge, initialGapCount, initialSatisfiedKeys);
  if (judge.passed) {
    return total > 0 ? total : judge.satisfied.length;
  }
  const newlyDone = calcNewlySatisfiedCount(judge, initialSatisfiedKeys);
  const alreadyDone = initialSatisfiedKeys.length;
  return Math.min(alreadyDone + newlyDone, total);
}

/**
 * 计算挑战完成进度百分比。
 * 功能：以总局内目标项为分母，已完成项为分子。
 * 参数：judge - 当前判题结果；initialGapCount - 开局时的差距项数量；initialSatisfiedKeys - 开局已满足 key。
 * 返回值：0~100 的整数百分比。
 */
export function calcChallengeProgress(
  judge: JudgeResult,
  initialGapCount: number,
  initialSatisfiedKeys: string[] = [],
): number {
  const total = calcTotalGoalCount(judge, initialGapCount, initialSatisfiedKeys);
  if (total === 0) {
    return judge.passed ? 100 : 0;
  }
  const resolvedCount = calcResolvedCount(judge, initialGapCount, initialSatisfiedKeys);
  return Math.min(100, Math.round((resolvedCount / total) * 100));
}
