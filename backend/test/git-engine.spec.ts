import { describe, expect, it } from "vitest";
import { GitEngineService } from "../src/git-engine/git-engine.service";
import type { RepoState } from "../src/git-engine/repo-state.types";
import { JudgeService } from "../src/judge/judge.service";
import { ALL_LEVELS } from "../prisma/level-definitions";

const gitEngine = new GitEngineService();
const judge = new JudgeService();

const baseState: RepoState = {
  commits: {
    c1: { id: "c1", message: "init", parents: [], files: { "a.txt": "hello" }, timestamp: 1 },
  },
  branches: { main: "c1" },
  head: { type: "branch", ref: "main" },
  workingTree: { "a.txt": { content: "hello", status: "unchanged" } },
  index: {},
  conflicts: {},
  stash: [],
  tags: {},
  reflog: [],
};

describe("GitEngineService", () => {
  it("拒绝非法 shell 命令且不改变状态", () => {
    const result = gitEngine.executeCommand("rm -rf /", baseState);
    expect(result.success).toBe(false);
    expect(result.state).toEqual(baseState);
  });

  it("git status 只读不改变状态内容", () => {
    const result = gitEngine.executeCommand("git status", baseState);
    expect(result.success).toBe(true);
    expect(result.output).toContain("位于分支 main");
  });

  it("add + commit 可完成工作流", () => {
    const modified: RepoState = {
      ...baseState,
      workingTree: { "a.txt": { content: "world", status: "modified" } },
    };
    const addResult = gitEngine.executeCommand("git add .", modified);
    expect(addResult.success).toBe(true);
    const commitResult = gitEngine.executeCommand('git commit -m "update"', addResult.state);
    expect(commitResult.success).toBe(true);
  });

  it("明镜无尘：git restore . 可恢复工作区", () => {
    const dirtyState: RepoState = {
      commits: {
        w4d5e6f: { id: "w4d5e6f", message: "base", parents: [], files: { "app.js": "clean" }, timestamp: 1 },
      },
      branches: { main: "w4d5e6f" },
      head: { type: "branch", ref: "main" },
      workingTree: { "app.js": { content: "dirty", status: "modified" } },
      index: {},
      conflicts: {},
      stash: [],
      tags: {},
      reflog: [],
    };
    const goal = { workingTreeClean: true, indexEmpty: true };

    const restoreResult = gitEngine.executeCommand("git restore .", dirtyState);
    expect(restoreResult.success).toBe(true);
    const judgeResult = judge.evaluate(restoreResult.state, goal, { baseScore: 100 }, 1);
    expect(judgeResult.passed).toBe(true);
  });

  it("明镜无尘：git restore --staged --worktree . 可恢复工作区与暂存区", () => {
    const dirtyState: RepoState = {
      commits: {
        w4d5e6f: { id: "w4d5e6f", message: "base", parents: [], files: { "app.js": "clean" }, timestamp: 1 },
      },
      branches: { main: "w4d5e6f" },
      head: { type: "branch", ref: "main" },
      workingTree: { "app.js": { content: "dirty", status: "modified" } },
      index: { "app.js": "dirty" },
      conflicts: {},
      stash: [],
      tags: {},
      reflog: [],
    };
    const goal = { workingTreeClean: true, indexEmpty: true };

    const restoreResult = gitEngine.executeCommand("git restore --staged --worktree .", dirtyState);
    expect(restoreResult.success).toBe(true);
    const judgeResult = judge.evaluate(restoreResult.state, goal, { baseScore: 100 }, 1);
    expect(judgeResult.passed).toBe(true);
  });
});

describe("只取所需关卡判题", () => {
  /** 关卡初始仓库：base 提交含 app.js v1 与 debug.log old log，两文件工作区均有新改动 */
  const selectiveAddState: RepoState = {
    commits: {
      s2b3c4d: {
        id: "s2b3c4d",
        message: "base",
        parents: [],
        files: { "app.js": "v1", "debug.log": "old log" },
        timestamp: 1,
      },
    },
    branches: { main: "s2b3c4d" },
    head: { type: "branch", ref: "main" },
    workingTree: {
      "app.js": { content: "v2", status: "modified" },
      "debug.log": { content: "new log", status: "modified" },
    },
    index: {},
    conflicts: {},
    stash: [],
    tags: {},
    reflog: [],
  };
  /** 只取所需目标：app.js 已提交、debug.log 仍保留本地修改且未进入最新提交 */
  const selectiveAddGoal = {
    fileContents: { "app.js": "v2", "debug.log": "old log" },
    workingTreeContents: { "debug.log": "new log" },
    indexEmpty: true,
  };

  it("git add . 误提交全部文件时不应通关", () => {
    const addAll = gitEngine.executeCommand("git add .", selectiveAddState);
    const commitAll = gitEngine.executeCommand('git commit -m "demo"', addAll.state);
    const result = judge.evaluate(commitAll.state, selectiveAddGoal, { baseScore: 100 }, 2);
    expect(result.passed).toBe(false);
    expect(result.gaps.some((gap) => gap.key === "fileContents:debug.log")).toBe(true);
  });

  it("git add app.js 只提交目标文件时应通关", () => {
    const addOne = gitEngine.executeCommand("git add app.js", selectiveAddState);
    const commitOne = gitEngine.executeCommand('git commit -m "demo"', addOne.state);
    const result = judge.evaluate(commitOne.state, selectiveAddGoal, { baseScore: 100 }, 2);
    expect(result.passed).toBe(true);
  });
});

describe("错改回正关卡判题", () => {
  /** 关卡初始仓库：HEAD 为正确 config，工作区被误改为 broken */
  const restoreLevelState: RepoState = {
    commits: {
      s4d5e6f: {
        id: "s4d5e6f",
        message: "base",
        parents: [],
        files: { "config.json": '{"mode":"prod"}' },
        timestamp: 1,
      },
    },
    branches: { main: "s4d5e6f" },
    head: { type: "branch", ref: "main" },
    workingTree: {
      "config.json": { content: '{"mode":"broken"}', status: "modified" },
    },
    index: {},
    conflicts: {},
    stash: [],
    tags: {},
    reflog: [],
  };
  /** 错改回正目标：restore 后工作区 clean，无需额外 commit */
  const restoreLevelGoal = {
    workingTreeClean: true,
    indexEmpty: true,
    currentBranch: "main",
  };

  it("git restore . 恢复工作区后应通关", () => {
    const restoreResult = gitEngine.executeCommand("git restore .", restoreLevelState);
    const result = judge.evaluate(restoreResult.state, restoreLevelGoal, { baseScore: 100 }, 1);
    expect(result.passed).toBe(true);
  });
});

describe("JudgeService", () => {
  it("按最终状态判题而非命令路径", () => {
    const goal = {
      currentBranch: "main",
      workingTreeClean: true,
      fileContents: { "a.txt": "hello" },
    };
    const result = judge.evaluate(baseState, goal, { baseScore: 100 }, 0);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
  });

  it("未达成目标时返回 gaps", () => {
    const goal = { currentBranch: "dev" };
    const result = judge.evaluate(baseState, goal, { baseScore: 100 }, 0);
    expect(result.passed).toBe(false);
    expect(result.gaps.length).toBeGreaterThan(0);
  });

  it("untrackedFiles 要求文件未入暂存区且未进入 HEAD", () => {
    const state: RepoState = {
      ...baseState,
      workingTree: {
        ...baseState.workingTree,
        "loose.txt": { content: "tmp", status: "untracked" },
      },
      index: { "loose.txt": "tmp" },
    };

    const result = judge.evaluate(
      state,
      { untrackedFiles: ["loose.txt"] },
      { baseScore: 100 },
      1,
    );

    expect(result.passed).toBe(false);
    expect(result.gaps.some((gap) => gap.key === "untrackedFiles:loose.txt")).toBe(true);
  });

  it("超过 maxSteps 时不允许通关", () => {
    const result = judge.evaluate(
      baseState,
      { fileContents: { "a.txt": "hello" } },
      { baseScore: 100, maxSteps: 1 },
      2,
    );

    expect(result.passed).toBe(false);
    expect(result.gaps.some((gap) => gap.key === "maxSteps")).toBe(true);
  });
});

describe("关卡判题回归", () => {
  it("所有种子关卡初始状态都不应直接通关", () => {
    const initialPassed = ALL_LEVELS.filter((level) => {
      const state = JSON.parse(JSON.stringify(level.initialState)) as RepoState;
      return judge.evaluate(state, level.goal, level.constraints, 0).passed;
    });

    expect(initialPassed.map((level) => level.sortOrder)).toEqual([]);
  });

  it("纯净快照：git add . 提交 junk.txt 时不应通关", () => {
    const level = ALL_LEVELS.find((item) => item.sortOrder === 10);
    expect(level).toBeDefined();

    const addAll = gitEngine.executeCommand("git add .", level!.initialState);
    const commitAll = gitEngine.executeCommand('git commit -m "demo"', addAll.state);
    const result = judge.evaluate(commitAll.state, level!.goal, level!.constraints, 2);

    expect(result.passed).toBe(false);
    expect(result.gaps.some((gap) => gap.key === "filesAbsentFromHead:junk.txt")).toBe(true);
  });

  it("纯净快照：只提交 app.js 时应通关", () => {
    const level = ALL_LEVELS.find((item) => item.sortOrder === 10);
    expect(level).toBeDefined();

    const addApp = gitEngine.executeCommand("git add app.js", level!.initialState);
    const commitApp = gitEngine.executeCommand('git commit -m "demo"', addApp.state);
    const result = judge.evaluate(commitApp.state, level!.goal, level!.constraints, 2);

    expect(result.passed).toBe(true);
  });
});

describe("merge 多路径", () => {
  const mergeState: RepoState = {
    commits: {
      m1: { id: "m1", message: "main", parents: [], files: { "x": "1" }, timestamp: 1 },
      f1: { id: "f1", message: "feat", parents: ["m1"], files: { "x": "2" }, timestamp: 2 },
    },
    branches: { main: "m1", feature: "f1" },
    head: { type: "branch", ref: "main" },
    workingTree: { "x": { content: "1", status: "unchanged" } },
    index: {},
    conflicts: {},
    stash: [],
  };

  it("merge 路径可通关", () => {
    const merged = gitEngine.executeCommand("git merge feature", mergeState);
    expect(merged.success).toBe(true);
    const judgeResult = judge.evaluate(
      merged.state,
      {
        branchMerged: [{ source: "feature", target: "main" }],
        fileContents: { "x": "2" },
        workingTreeClean: true,
      },
      { baseScore: 100 },
      1,
    );
    expect(judgeResult.passed).toBe(true);
  });
});
