import { describe, expect, it } from "vitest";
import {
  ALL_BADGES,
  type BadgeCategory,
} from "../src/badges/badge.definitions";
import { isBadgeUnlocked, type BadgeEvalContext } from "../src/badges/badge.evaluators";
import {
  hasRebaseContinue,
  hasStashRecover,
  hasStashSave,
  hasSubcommand,
} from "../src/badges/git-command.util";
import type { LevelGoal } from "../src/git-engine/repo-state.types";

/**
 * 构造最小徽章评估上下文。
 * 功能：测试用，按需覆盖字段。
 * 参数：patch - 需要覆盖的上下文字段。
 * 返回值：BadgeEvalContext。
 */
function makeContext(patch: Partial<BadgeEvalContext> = {}): BadgeEvalContext {
  return {
    publishedLevelCount: 0,
    publishedChapterIds: [],
    completedLevelIds: [],
    clearedChapterIds: [],
    totalScore: 0,
    allCommands: [],
    completedAttemptCommands: new Map(),
    levelGoals: new Map(),
    publishedLevelMeta: new Map(),
    levelResults: [],
    ...patch,
  };
}

/**
 * 向上下文追加一次通关 attempt。
 * 功能：简化命令类徽章测试数据构造。
 * 参数：context - 原上下文；attemptId - attempt id；levelId - 关卡 id；chapterId - 章节 id；commands - 命令列表。
 * 返回值：无。
 */
function addCompletedAttempt(
  context: BadgeEvalContext,
  attemptId: bigint,
  levelId: bigint,
  chapterId: string | null,
  commands: Array<{ command: string; success: boolean }>,
): void {
  context.completedAttemptCommands.set(attemptId, {
    levelId,
    chapterId,
    commands,
  });
  if (!context.completedLevelIds.includes(levelId)) {
    context.completedLevelIds.push(levelId);
  }
  if (chapterId && !context.clearedChapterIds.includes(chapterId)) {
    context.clearedChapterIds.push(chapterId);
  }
}

describe("badge definitions", () => {
  it("ALL_BADGES id 唯一", () => {
    const ids = ALL_BADGES.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("新增 category 都能被返回", () => {
    const categories = new Set(ALL_BADGES.map((item) => item.category));
    const expected: BadgeCategory[] = [
      "title",
      "command",
      "result",
      "workflow",
      "technique",
      "mastery",
    ];
    for (const category of expected) {
      expect(categories.has(category)).toBe(true);
    }
    expect(ALL_BADGES.length).toBe(47);
  });
});

describe("git command helpers", () => {
  it("识别 stash 保存与恢复", () => {
    const saveCommands = [{ command: "git stash push -m wip", success: true }];
    const recoverCommands = [{ command: "git stash pop", success: true }];
    expect(hasStashSave(saveCommands)).toBe(true);
    expect(hasStashSave(recoverCommands)).toBe(false);
    expect(hasStashRecover(recoverCommands)).toBe(true);
    expect(hasStashRecover(saveCommands)).toBe(false);
  });

  it("识别 rebase --continue", () => {
    const commands = [{ command: "git rebase --continue", success: true }];
    expect(hasRebaseContinue(commands)).toBe(true);
    expect(hasSubcommand(commands, "rebase")).toBe(true);
  });
});

describe("workflow badges", () => {
  it("workflow_stash_clear 需要通关 undo 章节（含 stash 关卡）", () => {
    const locked = makeContext();
    const unlocked = makeContext({ clearedChapterIds: ["undo"] });
    const legacy = makeContext({ clearedChapterIds: ["stash"] });
    expect(isBadgeUnlocked("workflow_stash_clear", locked)).toBe(false);
    expect(isBadgeUnlocked("workflow_stash_clear", unlocked)).toBe(true);
    expect(isBadgeUnlocked("workflow_stash_clear", legacy)).toBe(true);
  });

  it("workflow_tag_archive 需要通关含 requiredTags 的关卡", () => {
    const levelId = 29n;
    const goal: LevelGoal = { requiredTags: { "v1.0": "abc" } };
    const context = makeContext({
      levelResults: [{ levelId, commandCount: 5, score: 100 }],
      levelGoals: new Map([[levelId, goal]]),
    });
    expect(isBadgeUnlocked("workflow_tag_archive", context)).toBe(true);
  });

  it("workflow_all_chapters 需要每个章节至少通关 1 关", () => {
    const locked = makeContext({
      publishedChapterIds: ["workspace", "stash"],
      clearedChapterIds: ["workspace"],
    });
    const unlocked = makeContext({
      publishedChapterIds: ["workspace", "stash"],
      clearedChapterIds: ["workspace", "stash"],
    });
    expect(isBadgeUnlocked("workflow_all_chapters", locked)).toBe(false);
    expect(isBadgeUnlocked("workflow_all_chapters", unlocked)).toBe(true);
  });
});

describe("technique badges", () => {
  it("覆盖 stash/tag/cherry-pick/rebase/reflog/bisect 命令徽章", () => {
    const context = makeContext();
    addCompletedAttempt(context, 1n, 101n, "stash", [
      { command: "git stash", success: true },
      { command: "git stash pop", success: true },
      { command: "git tag v1.0", success: true },
      { command: "git cherry-pick fix01", success: true },
      { command: "git rebase main", success: true },
      { command: "git rebase --continue", success: true },
      { command: "git reflog", success: true },
      { command: "git bisect start", success: true },
    ]);

    expect(isBadgeUnlocked("tech_stash_save", context)).toBe(true);
    expect(isBadgeUnlocked("tech_stash_recover", context)).toBe(true);
    expect(isBadgeUnlocked("tech_tag", context)).toBe(true);
    expect(isBadgeUnlocked("tech_cherry_pick", context)).toBe(true);
    expect(isBadgeUnlocked("tech_rebase", context)).toBe(true);
    expect(isBadgeUnlocked("tech_rebase_continue", context)).toBe(true);
    expect(isBadgeUnlocked("tech_reflog", context)).toBe(true);
    expect(isBadgeUnlocked("tech_bisect", context)).toBe(true);
  });
});

describe("mastery badges", () => {
  it("覆盖连续成功、低命令数、多路径、失败恢复判定", () => {
    const cleanGoal: LevelGoal = { workingTreeClean: true };
    const levelGoals = new Map<bigint, LevelGoal>();
    for (let index = 1; index <= 5; index += 1) {
      levelGoals.set(BigInt(index), cleanGoal);
    }

    const streakContext = makeContext();
    for (let index = 1; index <= 5; index += 1) {
      addCompletedAttempt(
        streakContext,
        BigInt(index),
        BigInt(index),
        "workspace",
        [{ command: "git status", success: true }],
      );
    }
    expect(isBadgeUnlocked("mastery_no_fail_5", streakContext)).toBe(true);

    const lowStepContext = makeContext({
      levelResults: [
        { levelId: 1n, commandCount: 4, score: 90 },
        { levelId: 2n, commandCount: 5, score: 88 },
        { levelId: 3n, commandCount: 3, score: 95 },
      ],
    });
    expect(isBadgeUnlocked("mastery_low_steps_3", lowStepContext)).toBe(true);

    const multiPathContext = makeContext();
    addCompletedAttempt(multiPathContext, 1n, 10n, "branch", [
      { command: "git switch feature", success: true },
    ]);
    addCompletedAttempt(multiPathContext, 2n, 10n, "branch", [
      { command: "git checkout feature", success: true },
    ]);
    addCompletedAttempt(multiPathContext, 3n, 11n, "branch", [
      { command: "git merge feature", success: true },
    ]);
    addCompletedAttempt(multiPathContext, 4n, 11n, "branch", [
      { command: "git switch feature", success: true },
      { command: "git merge main", success: true },
    ]);
    addCompletedAttempt(multiPathContext, 5n, 12n, "branch", [
      { command: "git branch feature2", success: true },
    ]);
    addCompletedAttempt(multiPathContext, 6n, 12n, "branch", [
      { command: "git switch -c feature2", success: true },
    ]);
    expect(isBadgeUnlocked("mastery_multi_path_3", multiPathContext)).toBe(true);

    const recoveryContext = makeContext();
    addCompletedAttempt(recoveryContext, 1n, 21n, "merge", [
      { command: "git merge feature", success: false },
      { command: "git merge --abort", success: true },
      { command: "git merge feature", success: true },
    ]);
    addCompletedAttempt(recoveryContext, 2n, 22n, "merge", [
      { command: "git reset --hard", success: false },
      { command: "git merge feature", success: true },
    ]);
    addCompletedAttempt(recoveryContext, 3n, 23n, "undo", [
      { command: "git revert HEAD", success: false },
      { command: "git revert HEAD", success: true },
    ]);
    expect(isBadgeUnlocked("mastery_recovery_3", recoveryContext)).toBe(true);

    const cleanContext = makeContext({
      levelResults: [
        { levelId: 1n, commandCount: 3, score: 90 },
        { levelId: 2n, commandCount: 4, score: 88 },
        { levelId: 3n, commandCount: 5, score: 86 },
        { levelId: 4n, commandCount: 4, score: 92 },
        { levelId: 5n, commandCount: 3, score: 95 },
      ],
      levelGoals,
    });
    expect(isBadgeUnlocked("mastery_workspace_clean_5", cleanContext)).toBe(true);
  });

  it("mastery_full_clear_plus 需要全通且 200 分", () => {
    const locked = makeContext({
      publishedLevelCount: 40,
      completedLevelIds: Array.from({ length: 40 }, (_, index) => BigInt(index + 1)),
      totalScore: 180,
    });
    const unlocked = makeContext({
      publishedLevelCount: 40,
      completedLevelIds: Array.from({ length: 40 }, (_, index) => BigInt(index + 1)),
      totalScore: 200,
    });
    expect(isBadgeUnlocked("mastery_full_clear_plus", locked)).toBe(false);
    expect(isBadgeUnlocked("mastery_full_clear_plus", unlocked)).toBe(true);
  });
});
