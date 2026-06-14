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
 * 计算本轮玩家已消除的开局差距项数量。
 * 功能：仅以开局差距项为基准，进度从 0% 起算，不把开局已满足项算入分子。
 * 参数：judge - 当前判题结果；initialGapCount - 开局时的差距项数量。
 * 返回值：已完成的差距项数量。
 */
export function calcResolvedCount(
  judge: JudgeResult,
  initialGapCount: number,
): number {
  if (judge.passed) {
    return initialGapCount;
  }
  return Math.max(0, initialGapCount - judge.gaps.length);
}

/**
 * 计算挑战完成进度百分比。
 * 功能：分子为已消除的开局差距项，分母为开局差距项总数，开局必为 0%。
 * 参数：judge - 当前判题结果；initialGapCount - 开局时的差距项数量。
 * 返回值：0~100 的整数百分比。
 */
export function calcChallengeProgress(
  judge: JudgeResult,
  initialGapCount: number,
): number {
  if (judge.passed) {
    return 100;
  }
  if (initialGapCount === 0) {
    return 0;
  }
  const resolvedCount = calcResolvedCount(judge, initialGapCount);
  return Math.min(100, Math.round((resolvedCount / initialGapCount) * 100));
}
