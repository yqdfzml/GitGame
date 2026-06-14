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
  refreshWorkingTreeStatus,
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

    // 2b. 检查分支指针是否指向指定 commit
    if (goal.branchHeads) {
      for (const [branch, expectedCommit] of Object.entries(goal.branchHeads)) {
        const actualCommit = state.branches[branch];
        if (!actualCommit) {
          gaps.push({ key: "branchHeads", message: `分支 '${branch}' 不存在` });
          continue;
        }
        if (actualCommit === expectedCommit) {
          satisfied.push(`branchHeads:${branch}`);
        } else {
          gaps.push({
            key: `branchHeads:${branch}`,
            message: `分支 '${branch}' 应指向 '${expectedCommit}'，实际为 '${actualCommit}'`,
          });
        }
      }
    }

    // 3. 检查 HEAD 提交中的文件内容
    if (goal.fileContents) {
      const headId = getHeadCommitId(state);
      const headFiles = headId ? state.commits[headId]?.files ?? {} : {};
      for (const [path, expected] of Object.entries(goal.fileContents)) {
        const actual = headFiles[path];
        if (actual === expected) {
          satisfied.push(`fileContents:${path}`);
        } else {
          gaps.push({
            key: `fileContents:${path}`,
            message: `提交历史中 '${path}' 内容不符合目标`,
          });
        }
      }
    }

    // 3b. 检查工作区文件内容
    if (goal.workingTreeContents) {
      refreshWorkingTreeStatus(state);
      for (const [path, expected] of Object.entries(goal.workingTreeContents)) {
        const actual = state.workingTree[path]?.content;
        if (actual === expected) {
          satisfied.push(`workingTreeContents:${path}`);
        } else {
          gaps.push({
            key: `workingTreeContents:${path}`,
            message: `工作区 '${path}' 内容不符合目标`,
          });
        }
      }
    }

    // 3c. 检查文件必须保持未跟踪
    if (goal.untrackedFiles) {
      refreshWorkingTreeStatus(state);
      for (const path of goal.untrackedFiles) {
        const file = state.workingTree[path];
        if (file && (file.status === "untracked" || file.status === "added")) {
          satisfied.push(`untrackedFiles:${path}`);
        } else {
          gaps.push({
            key: `untrackedFiles:${path}`,
            message: `文件 '${path}' 应保持未跟踪状态`,
          });
        }
      }
    }

    // 3d. 检查暂存区文件内容
    if (goal.indexContents) {
      for (const [path, expected] of Object.entries(goal.indexContents)) {
        const actual = state.index[path];
        if (actual === expected) {
          satisfied.push(`indexContents:${path}`);
        } else {
          gaps.push({
            key: `indexContents:${path}`,
            message: `暂存区 '${path}' 内容不符合目标`,
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

    // 9. HEAD 必须是 merge commit
    if (goal.mergeCommitRequired) {
      const headId = getHeadCommitId(state);
      const headCommit = headId ? state.commits[headId] : null;
      if (headCommit && headCommit.parents.length >= 2) {
        satisfied.push("mergeCommitRequired");
      } else {
        gaps.push({ key: "mergeCommitRequired", message: "当前提交应为 merge commit（两个父提交）" });
      }
    }

    // 10. 贮藏栈中必须保存指定工作区内容
    if (goal.stashContents) {
      const stashList = state.stash ?? [];
      let matched = false;
      for (const entry of stashList) {
        const allMatch = Object.entries(goal.stashContents).every(
          ([path, expected]) => entry.workingTree[path]?.content === expected,
        );
        if (allMatch) {
          matched = true;
          break;
        }
      }
      if (matched) {
        satisfied.push("stashContents");
      } else {
        gaps.push({ key: "stashContents", message: "贮藏栈中未找到目标工作内容" });
      }
    }

    // 11. 标签必须指向指定 commit
    if (goal.requiredTags) {
      for (const [tagName, expectedCommit] of Object.entries(goal.requiredTags)) {
        const actualCommit = state.tags?.[tagName];
        if (actualCommit === expectedCommit) {
          satisfied.push(`requiredTags:${tagName}`);
        } else {
          gaps.push({
            key: "requiredTags",
            message: `标签 '${tagName}' 应指向 '${expectedCommit}'`,
          });
        }
      }
    }

    // 12. bisect 必须定位到指定不良 commit
    if (goal.bisectFound) {
      if (state.bisect?.foundBadId === goal.bisectFound) {
        satisfied.push("bisectFound");
      } else {
        gaps.push({
          key: "bisectFound",
          message: "尚未通过 bisect 定位到首个不良提交",
        });
      }
    }

    // 13. 指定分支必须不存在
    if (goal.branchMustNotExist) {
      for (const branchName of goal.branchMustNotExist) {
        if (!state.branches[branchName]) {
          satisfied.push(`branchMustNotExist:${branchName}`);
        } else {
          gaps.push({
            key: "branchMustNotExist",
            message: `分支 '${branchName}' 不应存在`,
          });
        }
      }
    }

    const baseScore = constraints.baseScore ?? 100;
    const stepPenalty = constraints.stepPenalty ?? 1;

    // 14. 最少步数约束：观察型关卡要求玩家至少执行一次命令
    if (gaps.length === 0 && constraints.minSteps !== undefined && stepCount < constraints.minSteps) {
      gaps.push({
        key: "minSteps",
        message: `请至少执行 ${constraints.minSteps} 次 git 命令`,
      });
    }

    const finalPassed = gaps.length === 0;
    const score = finalPassed ? Math.max(0, baseScore - stepCount * stepPenalty) : 0;

    return { passed: finalPassed, satisfied, gaps, score };
  }
}
