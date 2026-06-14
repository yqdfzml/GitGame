import type { LevelGoal } from "../git-engine/repo-state.types";
import {
  buildCommandFingerprint,
  countSuccessfulSubcommand,
  hasRebaseContinue,
  hasStashRecover,
  hasStashSave,
  hasSubcommand,
} from "./git-command.util";
import {
  FULL_CLEAR_PLUS_SCORE_THRESHOLD,
  MASTERY_SCORE_TIER_1,
  MASTERY_SCORE_TIER_2,
  TITLE_HIGH_SCORE_THRESHOLD,
} from "../judge/scoring.constants";

/** 已发布关卡元数据，供 workflow 判定使用 */
export interface PublishedLevelMeta {
  /** 章节 id */
  chapterId: string | null;
  /** 关卡说明文案 */
  description: string;
}

/** 评估上下文：从数据库聚合出的用户行为快照 */
export interface BadgeEvalContext {
  /** 已发布关卡总数 */
  publishedLevelCount: number;
  /** 已发布章节 id 列表（去重） */
  publishedChapterIds: string[];
  /** 已通关关卡 id 列表 */
  completedLevelIds: bigint[];
  /** 已通关章节 id 列表 */
  clearedChapterIds: string[];
  /** 累计得分 */
  totalScore: number;
  /** 用户全部命令记录 */
  allCommands: Array<{ command: string; success: boolean; attemptId: bigint; levelId: bigint }>;
  /** 已完成 attempt 的命令，按 attempt 分组 */
  completedAttemptCommands: Map<
    bigint,
    { levelId: bigint; chapterId: string | null; commands: Array<{ command: string; success: boolean }> }
  >;
  /** 关卡 goal 映射 */
  levelGoals: Map<bigint, LevelGoal>;
  /** 已发布关卡元数据映射 */
  publishedLevelMeta: Map<bigint, PublishedLevelMeta>;
  /** 最佳通关记录 */
  levelResults: Array<{ levelId: bigint; commandCount: number; score: number }>;
}

/**
 * 判断单个徽章是否满足解锁条件。
 * 功能：集中处理全部 badgeId 的解锁逻辑。
 * 参数：badgeId - 徽章 id；context - 评估上下文。
 * 返回值：是否应解锁。
 */
export function isBadgeUnlocked(badgeId: string, context: BadgeEvalContext): boolean {
  const completedCount = context.completedLevelIds.length;

  switch (badgeId) {
    case "title_01":
      return completedCount >= 1;
    case "title_02":
      return completedCount >= 2;
    case "title_03":
      return context.clearedChapterIds.includes("workspace");
    case "title_04":
      return context.clearedChapterIds.includes("branch");
    case "title_05":
      return context.clearedChapterIds.includes("merge");
    case "title_06":
      return context.clearedChapterIds.includes("undo");
    case "title_07":
      return context.clearedChapterIds.includes("snapshot");
    case "title_08":
      return hasHistoryCommandInCompletedAttempt(context);
    case "title_09":
      return context.publishedLevelCount > 0 && completedCount >= context.publishedLevelCount;
    case "title_10":
      return (
        context.publishedLevelCount > 0 &&
        completedCount >= context.publishedLevelCount &&
        context.totalScore >= TITLE_HIGH_SCORE_THRESHOLD
      );
    case "cmd_status":
      return hasCommandInAnyCompletedAttempt(context, "status");
    case "cmd_commit_10":
      return countSuccessfulSubcommand(context.allCommands, "commit") >= 10;
    case "cmd_branch":
      return hasChapterCommandPass(context, "branch", ["branch", "checkout", "switch"]);
    case "cmd_merge":
      return hasChapterCommandPass(context, "merge", ["merge"]);
    case "cmd_conflict":
      return context.clearedChapterIds.includes("merge");
    case "cmd_undo":
      return hasChapterCommandPass(context, "undo", ["reset", "revert", "restore"]);
    case "cmd_restore":
      return hasCommandInAnyCompletedAttempt(context, "restore");
    case "cmd_reset":
      return hasCommandInAnyCompletedAttempt(context, "reset");
    case "cmd_add":
      return countCompletedAttemptsWithCommand(context, "add") >= 3;
    case "cmd_clean":
      return hasCleanTreePass(context);
    case "result_multi_path":
      return hasMultiPathClear(context, 1);
    case "result_recovery":
      return hasRecoveryPass(context);
    case "result_min_steps":
      return context.levelResults.some((item) => item.commandCount <= 5);
    case "result_streak":
      return hasSuccessStreak(context, 3);
    case "result_all_clear":
      return context.publishedLevelCount > 0 && completedCount >= context.publishedLevelCount;
    case "workflow_stash_clear":
      return context.clearedChapterIds.includes("stash");
    case "workflow_tag_archive":
      return hasRequiredTagsLevelPass(context);
    case "workflow_cherry_pick":
      return context.clearedChapterIds.includes("cherry-pick");
    case "workflow_rebase":
      return hasRebasePathPass(context);
    case "workflow_debug":
      return context.clearedChapterIds.includes("debug");
    case "workflow_all_chapters":
      return hasAllChaptersCleared(context);
    case "tech_stash_save":
      return hasCommandPatternInCompletedAttempt(context, hasStashSave);
    case "tech_stash_recover":
      return hasCommandPatternInCompletedAttempt(context, hasStashRecover);
    case "tech_tag":
      return hasCommandInAnyCompletedAttempt(context, "tag");
    case "tech_cherry_pick":
      return hasCommandInAnyCompletedAttempt(context, "cherry-pick");
    case "tech_rebase":
      return hasCommandInAnyCompletedAttempt(context, "rebase");
    case "tech_rebase_continue":
      return hasCommandPatternInCompletedAttempt(context, hasRebaseContinue);
    case "tech_reflog":
      return hasCommandInAnyCompletedAttempt(context, "reflog");
    case "tech_bisect":
      return hasCommandInAnyCompletedAttempt(context, "bisect");
    case "mastery_workspace_clean_5":
      return countCleanTreeLevels(context) >= 5;
    case "mastery_low_steps_3":
      return countLowStepLevels(context, 5) >= 3;
    case "mastery_score_300":
      return context.totalScore >= MASTERY_SCORE_TIER_1;
    case "mastery_score_600":
      return context.totalScore >= MASTERY_SCORE_TIER_2;
    case "mastery_no_fail_5":
      return hasSuccessStreak(context, 5);
    case "mastery_recovery_3":
      return countRecoveryLevels(context) >= 3;
    case "mastery_multi_path_3":
      return hasMultiPathClear(context, 3);
    case "mastery_full_clear_plus":
      return (
        context.publishedLevelCount > 0 &&
        completedCount >= context.publishedLevelCount &&
        context.totalScore >= FULL_CLEAR_PLUS_SCORE_THRESHOLD
      );
    default:
      return false;
  }
}

/**
 * 是否在任意通关 attempt 中用过 reset / revert / restore。
 * 参数：context - 评估上下文。
 * 返回值：是否命中。
 */
function hasHistoryCommandInCompletedAttempt(context: BadgeEvalContext): boolean {
  for (const entry of context.completedAttemptCommands.values()) {
    if (
      hasSubcommand(entry.commands, "reset") ||
      hasSubcommand(entry.commands, "revert") ||
      hasSubcommand(entry.commands, "restore")
    ) {
      return true;
    }
  }
  return false;
}

/**
 * 是否在任意通关 attempt 中用过指定子命令。
 * 参数：context - 评估上下文；subcommand - git 子命令。
 * 返回值：是否命中。
 */
function hasCommandInAnyCompletedAttempt(context: BadgeEvalContext, subcommand: string): boolean {
  for (const entry of context.completedAttemptCommands.values()) {
    if (hasSubcommand(entry.commands, subcommand)) {
      return true;
    }
  }
  return false;
}

/**
 * 是否在任意通关 attempt 中命中自定义命令模式。
 * 参数：context - 评估上下文；matcher - 单局命令判定函数。
 * 返回值：是否命中。
 */
function hasCommandPatternInCompletedAttempt(
  context: BadgeEvalContext,
  matcher: (commands: Array<{ command: string; success: boolean }>) => boolean,
): boolean {
  for (const entry of context.completedAttemptCommands.values()) {
    if (matcher(entry.commands)) {
      return true;
    }
  }
  return false;
}

/**
 * 指定章节通关且使用过目标命令之一。
 * 参数：context - 评估上下文；chapterId - 章节 id；subcommands - 目标命令列表。
 * 返回值：是否命中。
 */
function hasChapterCommandPass(
  context: BadgeEvalContext,
  chapterId: string,
  subcommands: string[],
): boolean {
  for (const entry of context.completedAttemptCommands.values()) {
    if (entry.chapterId !== chapterId) {
      continue;
    }
    const hit = subcommands.some((sub) => hasSubcommand(entry.commands, sub));
    if (hit) {
      return true;
    }
  }
  return false;
}

/**
 * 统计有多少次不同关卡的通关 attempt 用过指定命令。
 * 参数：context - 评估上下文；subcommand - git 子命令。
 * 返回值：不同关卡数量。
 */
function countCompletedAttemptsWithCommand(context: BadgeEvalContext, subcommand: string): number {
  const levelIds = new Set<bigint>();
  for (const entry of context.completedAttemptCommands.values()) {
    if (hasSubcommand(entry.commands, subcommand)) {
      levelIds.add(entry.levelId);
    }
  }
  return levelIds.size;
}

/**
 * 是否在要求 clean 的关卡中通关。
 * 参数：context - 评估上下文。
 * 返回值：是否命中。
 */
function hasCleanTreePass(context: BadgeEvalContext): boolean {
  return countCleanTreeLevels(context) >= 1;
}

/**
 * 统计通关且 goal 要求 working tree clean 的不同关卡数。
 * 参数：context - 评估上下文。
 * 返回值：关卡数量。
 */
function countCleanTreeLevels(context: BadgeEvalContext): number {
  const levelIds = new Set<bigint>();
  for (const result of context.levelResults) {
    const goal = context.levelGoals.get(result.levelId);
    if (goal?.workingTreeClean) {
      levelIds.add(result.levelId);
    }
  }
  return levelIds.size;
}

/**
 * 统计用不超过 maxSteps 条命令通关的不同关卡数。
 * 参数：context - 评估上下文；maxSteps - 命令上限。
 * 返回值：关卡数量。
 */
function countLowStepLevels(context: BadgeEvalContext, maxSteps: number): number {
  const levelIds = new Set<bigint>();
  for (const result of context.levelResults) {
    if (result.commandCount <= maxSteps) {
      levelIds.add(result.levelId);
    }
  }
  return levelIds.size;
}

/**
 * 统计存在两种不同命令路径通关的关卡数。
 * 参数：context - 评估上下文；requiredLevelCount - 至少需要的关卡数。
 * 返回值：是否达到要求。
 */
function hasMultiPathClear(context: BadgeEvalContext, requiredLevelCount: number): boolean {
  const fingerprintsByLevel = new Map<bigint, Set<string>>();
  for (const entry of context.completedAttemptCommands.values()) {
    const fingerprint = buildCommandFingerprint(entry.commands);
    if (!fingerprintsByLevel.has(entry.levelId)) {
      fingerprintsByLevel.set(entry.levelId, new Set());
    }
    fingerprintsByLevel.get(entry.levelId)!.add(fingerprint);
  }

  let matchedLevelCount = 0;
  for (const fingerprints of fingerprintsByLevel.values()) {
    if (fingerprints.size >= 2) {
      matchedLevelCount += 1;
    }
  }
  return matchedLevelCount >= requiredLevelCount;
}

/**
 * 是否在含失败命令的 attempt 中最终通关。
 * 参数：context - 评估上下文。
 * 返回值：是否命中。
 */
function hasRecoveryPass(context: BadgeEvalContext): boolean {
  return countRecoveryLevels(context) >= 1;
}

/**
 * 统计出现失败命令后仍通关的不同关卡数。
 * 参数：context - 评估上下文。
 * 返回值：关卡数量。
 */
function countRecoveryLevels(context: BadgeEvalContext): number {
  const levelIds = new Set<bigint>();
  for (const entry of context.completedAttemptCommands.values()) {
    const hasFailure = entry.commands.some((cmd) => !cmd.success);
    if (hasFailure) {
      levelIds.add(entry.levelId);
    }
  }
  return levelIds.size;
}

/**
 * 最近 N 次通关 attempt 是否全部命令成功。
 * 参数：context - 评估上下文；streakSize - 连续次数。
 * 返回值：是否命中。
 */
function hasSuccessStreak(context: BadgeEvalContext, streakSize: number): boolean {
  const completedAttempts = [...context.completedAttemptCommands.entries()];
  if (completedAttempts.length < streakSize) {
    return false;
  }
  const recent = completedAttempts.slice(-streakSize);
  for (const [, entry] of recent) {
    const allSuccess = entry.commands.every((cmd) => cmd.success);
    if (!allSuccess) {
      return false;
    }
  }
  return true;
}

/**
 * 是否通关过含 requiredTags 目标的关卡。
 * 参数：context - 评估上下文。
 * 返回值：是否命中。
 */
function hasRequiredTagsLevelPass(context: BadgeEvalContext): boolean {
  for (const result of context.levelResults) {
    const goal = context.levelGoals.get(result.levelId);
    if (goal?.requiredTags && Object.keys(goal.requiredTags).length > 0) {
      return true;
    }
  }
  return false;
}

/**
 * 是否通关过含 rebase 路径描述的关卡。
 * 参数：context - 评估上下文。
 * 返回值：是否命中。
 */
function hasRebasePathPass(context: BadgeEvalContext): boolean {
  for (const result of context.levelResults) {
    const meta = context.publishedLevelMeta.get(result.levelId);
    if (meta?.description.toLowerCase().includes("rebase")) {
      return true;
    }
  }
  return false;
}

/**
 * 是否每个已发布章节都至少通关 1 关。
 * 参数：context - 评估上下文。
 * 返回值：是否命中。
 */
function hasAllChaptersCleared(context: BadgeEvalContext): boolean {
  if (context.publishedChapterIds.length === 0) {
    return false;
  }
  for (const chapterId of context.publishedChapterIds) {
    if (!context.clearedChapterIds.includes(chapterId)) {
      return false;
    }
  }
  return true;
}
