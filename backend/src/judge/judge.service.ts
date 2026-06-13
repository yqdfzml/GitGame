import { Injectable } from "@nestjs/common";
import type {
  JudgeResult,
  LevelConstraints,
  LevelGoal,
  RepoState,
} from "../git-engine/repo-state.types";
import {
  getHeadCommitId,
  isAncestor,
  isIndexEmpty,
  isWorkingTreeClean,
} from "../git-engine/git-engine.utils";

/**
 * 结果导向判题服务。
 * 功能：只检查最终仓库状态是否满足 goal/constraints，不检查命令路径。
 * 参数：通过 evaluate 传入当前状态、目标和约束。
 * 返回值：JudgeResult，含 passed、gaps、score。
 */
@Injectable()
export class JudgeService {
  /**
   * 评估当前仓库状态是否达成关卡目标。
   * 功能：逐项检查 goal 条件并计算得分。
   * 参数：state - 当前仓库；goal - 目标；constraints - 约束；stepCount - 已用步数。
   * 返回值：JudgeResult。
   */
  evaluate(
    state: RepoState,
    goal: LevelGoal,
    constraints: LevelConstraints,
    stepCount: number,
  ): JudgeResult {
    const satisfied: string[] = [];
    const gaps: Array<{ key: string; message: string }> = [];

    // 1. 检查当前分支
    if (goal.currentBranch !== undefined) {
      const currentBranch = state.head.type === "branch" ? state.head.ref : null;
      if (currentBranch === goal.currentBranch) {
        satisfied.push("currentBranch");
      } else {
        gaps.push({
          key: "currentBranch",
          message: `当前应在分支 '${goal.currentBranch}'，实际为 '${currentBranch ?? "detached"}'`,
        });
      }
    }

    // 2. 检查分支是否包含指定 commit
    if (goal.branchContains) {
      for (const item of goal.branchContains) {
        const tip = state.branches[item.branch];
        if (!tip) {
          gaps.push({ key: "branchContains", message: `分支 '${item.branch}' 不存在` });
          continue;
        }
        if (isAncestor(state, item.commit, tip) || tip === item.commit) {
          satisfied.push(`branchContains:${item.branch}:${item.commit}`);
        } else {
          gaps.push({
            key: "branchContains",
            message: `分支 '${item.branch}' 尚未包含 commit '${item.commit}'`,
          });
        }
      }
    }

    // 3. 检查文件最终内容
    if (goal.fileContents) {
      const headId = getHeadCommitId(state);
      const headFiles = headId ? state.commits[headId]?.files ?? {} : {};
      for (const [path, expected] of Object.entries(goal.fileContents)) {
        const actual = headFiles[path];
        if (actual === expected) {
          satisfied.push(`fileContents:${path}`);
        } else {
          gaps.push({
            key: "fileContents",
            message: `文件 '${path}' 内容不符合目标`,
          });
        }
      }
    }

    // 4. 工作区 clean
    if (goal.workingTreeClean) {
      if (isWorkingTreeClean(state)) {
        satisfied.push("workingTreeClean");
      } else {
        gaps.push({ key: "workingTreeClean", message: "工作区尚未 clean" });
      }
    }

    // 5. 暂存区 empty
    if (goal.indexEmpty) {
      if (isIndexEmpty(state)) {
        satisfied.push("indexEmpty");
      } else {
        gaps.push({ key: "indexEmpty", message: "暂存区尚未清空" });
      }
    }

    // 6. 无冲突
    if (goal.noConflicts) {
      if (Object.keys(state.conflicts).length === 0) {
        satisfied.push("noConflicts");
      } else {
        gaps.push({ key: "noConflicts", message: "仍存在未解决冲突" });
      }
    }

    // 7. 指定 commit 必须存在
    if (goal.commitsExist) {
      for (const commitId of goal.commitsExist) {
        if (state.commits[commitId]) {
          satisfied.push(`commitsExist:${commitId}`);
        } else {
          gaps.push({ key: "commitsExist", message: `commit '${commitId}' 已丢失` });
        }
      }
    }

    // 8. 分支已合并
    if (goal.branchMerged) {
      for (const item of goal.branchMerged) {
        const sourceTip = state.branches[item.source];
        const targetTip = state.branches[item.target];
        if (!sourceTip || !targetTip) {
          gaps.push({ key: "branchMerged", message: `分支 '${item.source}' 或 '${item.target}' 不存在` });
          continue;
        }
        if (isAncestor(state, sourceTip, targetTip)) {
          satisfied.push(`branchMerged:${item.source}->${item.target}`);
        } else {
          gaps.push({
            key: "branchMerged",
            message: `'${item.source}' 尚未合并到 '${item.target}'`,
          });
        }
      }
    }

    const passed = gaps.length === 0;
    const baseScore = constraints.baseScore ?? 100;
    const stepPenalty = constraints.stepPenalty ?? 1;
    const score = passed ? Math.max(0, baseScore - stepCount * stepPenalty) : 0;

    return { passed, satisfied, gaps, score };
  }
}
