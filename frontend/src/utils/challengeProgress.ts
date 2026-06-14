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
  if (judge.passed) {
    return initialGapCount;
  }
  return Math.min(calcNewlySatisfiedCount(judge, initialSatisfiedKeys), initialGapCount);
}

/**
 * 计算挑战完成进度百分比。
 * 功能：以开局差距项为分母、新达成项为分子，避免状态倒退时出现负进度。
 * 参数：judge - 当前判题结果；initialGapCount - 开局时的差距项数量；initialSatisfiedKeys - 开局已满足 key。
 * 返回值：0~100 的整数百分比。
 */
export function calcChallengeProgress(
  judge: JudgeResult,
  initialGapCount: number,
  initialSatisfiedKeys: string[] = [],
): number {
  if (judge.passed) {
    return 100;
  }
  if (initialGapCount === 0) {
    return 0;
  }
  const resolvedCount = calcResolvedCount(judge, initialGapCount, initialSatisfiedKeys);
  return Math.min(100, Math.round((resolvedCount / initialGapCount) * 100));
}
