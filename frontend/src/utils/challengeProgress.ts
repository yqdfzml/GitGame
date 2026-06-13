import type { JudgeResult } from "../types";

/**
 * 计算挑战完成进度百分比。
 * 功能：以开局时的差距项数量为基准，只统计玩家本轮新消除的差距。
 * 参数：judge - 当前判题结果；initialGapCount - 开局时的差距项数量。
 * 返回值：0~100 的整数百分比。
 */
export function calcChallengeProgress(judge: JudgeResult, initialGapCount: number): number {
  if (judge.passed) {
    return 100;
  }
  if (initialGapCount === 0) {
    return 0;
  }
  const resolvedCount = initialGapCount - judge.gaps.length;
  return Math.round((resolvedCount / initialGapCount) * 100);
}
