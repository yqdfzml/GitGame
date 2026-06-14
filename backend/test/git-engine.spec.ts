import { describe, expect, it } from "vitest";
import { GitEngineService } from "../src/git-engine/git-engine.service";
import type { RepoState } from "../src/git-engine/repo-state.types";
import { JudgeService } from "../src/judge/judge.service";

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
