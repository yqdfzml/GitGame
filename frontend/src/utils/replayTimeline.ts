import type { CommandEntry, RepoState } from "../types";

/** 时间线单步数据 */
export interface ReplayTimelineStep {
  stepIndex: number;
  command: string;
  success: boolean;
  feedback: string;
  output: string | null;
  state: RepoState | null;
  stateSummary: string;
  suggestion: string | null;
}

/**
 * 将仓库状态压缩成一行摘要。
 * 功能：帮助用户在时间线上快速理解状态变化。
 * 参数：state - 仓库快照。
 * 返回值：中文摘要字符串。
 */
export const summarizeRepoState = (state: RepoState | null): string => {
  if (!state) {
    return "暂无仓库快照";
  }

  const headRef = state.head.type === "branch" ? `分支 ${state.head.ref}` : `分离 HEAD @ ${state.head.ref}`;
  const workingCount = Object.keys(state.workingTree).length;
  const indexCount = Object.keys(state.index).length;
  const conflictCount = Object.keys(state.conflicts).length;
  const branchCount = Object.keys(state.branches).length;
  const commitCount = Object.keys(state.commits).length;

  const parts = [
    headRef,
    `提交 ${commitCount}`,
    `分支 ${branchCount}`,
    `工作区 ${workingCount} 文件`,
    `暂存区 ${indexCount} 文件`,
  ];

  if (conflictCount > 0) {
    parts.push(`冲突 ${conflictCount}`);
  }

  return parts.join(" · ");
};

/**
 * 根据失败命令生成改进建议。
 * 功能：让复盘不只展示日志，还给出学习提示。
 * 参数：command - 用户输入命令；feedback - 执行反馈。
 * 返回值：建议文案，成功时返回 null。
 */
export const buildCommandSuggestion = (command: string, success: boolean, feedback: string): string | null => {
  if (success) {
    return null;
  }

  const normalized = command.trim().toLowerCase();

  if (normalized.startsWith("git status")) {
    return "先用 status 看清工作区、暂存区与 HEAD，再决定下一步。";
  }
  if (normalized.startsWith("git add")) {
    return "确认要暂存的文件是否正确，必要时先用 status 检查。";
  }
  if (normalized.startsWith("git commit")) {
    return "提交前确保暂存区已有目标变更，并检查 commit message。";
  }
  if (normalized.startsWith("git switch") || normalized.startsWith("git checkout")) {
    return "切换分支前确认工作区是否干净，必要时先 stash 或提交。";
  }
  if (normalized.startsWith("git merge")) {
    return "合并前确认当前分支正确，并准备好处理冲突。";
  }
  if (normalized.startsWith("git reset") || normalized.startsWith("git restore") || normalized.startsWith("git revert")) {
    return "撤销类命令影响大，先确认要保留历史还是只恢复文件。";
  }
  if (feedback.includes("冲突")) {
    return "出现冲突时先定位文件，手动解决后再 add 并继续流程。";
  }

  return "回顾关卡目标，确认当前 HEAD、工作区与暂存区是否符合预期。";
};

/**
 * 组装复盘时间线。
 * 功能：合并命令与快照，生成默认时间线视图数据。
 * 参数：commands - 命令历史；snapshots - 状态快照列表。
 * 返回值：ReplayTimelineStep 数组。
 */
export const buildReplayTimeline = (
  commands: CommandEntry[],
  snapshots: Array<{ stepIndex: number; state: RepoState }>,
): ReplayTimelineStep[] => {
  const snapshotMap = new Map<number, RepoState>();
  for (const snapshot of snapshots) {
    snapshotMap.set(snapshot.stepIndex, snapshot.state);
  }

  return commands.map((command) => {
    const state = snapshotMap.get(command.stepIndex) ?? null;
    return {
      stepIndex: command.stepIndex,
      command: command.command,
      success: command.success,
      feedback: command.feedback,
      output: command.output,
      state,
      stateSummary: summarizeRepoState(state),
      suggestion: buildCommandSuggestion(command.command, command.success, command.feedback),
    };
  });
};

/**
 * 统计复盘结果摘要。
 * 功能：顶部展示本次练习是否顺利。
 * 参数：steps - 时间线步骤。
 * 返回值：成功步数、失败步数、总结文案。
 */
export const buildReplaySummary = (steps: ReplayTimelineStep[]) => {
  const successCount = steps.filter((step) => step.success).length;
  const failCount = steps.length - successCount;

  let headline = "本次练习整体顺利";
  if (failCount > 0) {
    headline = `共 ${failCount} 步失败，建议重点回看失败步骤`;
  }

  return {
    successCount,
    failCount,
    headline,
  };
};
