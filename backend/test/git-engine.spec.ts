import { describe, expect, it } from "vitest";
import { resolveConflictFile, hasConflictMarkers } from "../src/git-engine/git-engine.utils";
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

  it("echo 重定向可新建未跟踪文件", () => {
    const result = gitEngine.executeCommand('echo "f1" > feature.txt', baseState);
    expect(result.success).toBe(true);
    expect(result.state.workingTree["feature.txt"]).toEqual({
      content: "f1",
      status: "untracked",
    });
  });

  it("echo 重定向可覆盖已跟踪文件", () => {
    const result = gitEngine.executeCommand("echo v2 > a.txt", baseState);
    expect(result.success).toBe(true);
    expect(result.state.workingTree["a.txt"]).toEqual({
      content: "v2",
      status: "modified",
    });
  });

  it("拒绝路径穿越的 echo 写文件", () => {
    const result = gitEngine.executeCommand('echo "x" > ../secret.txt', baseState);
    expect(result.success).toBe(false);
    expect(result.state).toEqual(baseState);
  });

  it("touch 可新建未跟踪空文件", () => {
    const result = gitEngine.executeCommand("touch feature.txt", baseState);
    expect(result.success).toBe(true);
    expect(result.state.workingTree["feature.txt"]).toEqual({
      content: "",
      status: "untracked",
    });
  });

  it("touch 已存在文件时不改动内容", () => {
    const result = gitEngine.executeCommand("touch a.txt", baseState);
    expect(result.success).toBe(true);
    expect(result.state.workingTree["a.txt"]).toEqual({
      content: "hello",
      status: "unchanged",
    });
  });

  it("双脉并行：touch + echo 新建文件后可 commit 通关", () => {
    const level = ALL_LEVELS.find((item) => item.title === "双脉并行");
    expect(level).toBeDefined();

    const addMain = gitEngine.executeCommand("git add main.txt", level!.initialState);
    const commitMain = gitEngine.executeCommand('git commit -m "main update"', addMain.state);
    expect(commitMain.success).toBe(true);

    const switchFeature = gitEngine.executeCommand("git switch feature", commitMain.state);
    expect(switchFeature.success).toBe(true);

    const touchFeatureFile = gitEngine.executeCommand("touch feature.txt", switchFeature.state);
    expect(touchFeatureFile.success).toBe(true);

    const writeFeatureFile = gitEngine.executeCommand('echo "f1" > feature.txt', touchFeatureFile.state);
    expect(writeFeatureFile.success).toBe(true);

    const addFeatureFile = gitEngine.executeCommand("git add feature.txt", writeFeatureFile.state);
    const commitFeature = gitEngine.executeCommand('git commit -m "add feature file"', addFeatureFile.state);
    const result = judge.evaluate(commitFeature.state, level!.goal, level!.constraints, 5);

    expect(result.passed).toBe(true);
  });

  it("双脉并行：echo 新建文件后可 add 并 commit 通关", () => {
    const level = ALL_LEVELS.find((item) => item.title === "双脉并行");
    expect(level).toBeDefined();

    const addMain = gitEngine.executeCommand("git add main.txt", level!.initialState);
    const commitMain = gitEngine.executeCommand('git commit -m "main update"', addMain.state);
    expect(commitMain.success).toBe(true);

    const switchFeature = gitEngine.executeCommand("git switch feature", commitMain.state);
    expect(switchFeature.success).toBe(true);

    const createFeatureFile = gitEngine.executeCommand('echo "f1" > feature.txt', switchFeature.state);
    expect(createFeatureFile.success).toBe(true);

    const addFeatureFile = gitEngine.executeCommand("git add feature.txt", createFeatureFile.state);
    const commitFeature = gitEngine.executeCommand('git commit -m "add feature file"', addFeatureFile.state);
    const result = judge.evaluate(commitFeature.state, level!.goal, level!.constraints, 4);

    expect(result.passed).toBe(true);
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

  it("空仓起手：git init 可通关", () => {
    const level = ALL_LEVELS.find((item) => item.title === "空仓起手");
    expect(level).toBeDefined();
    const initResult = gitEngine.executeCommand("git init", level!.initialState);
    const result = judge.evaluate(initResult.state, level!.goal, level!.constraints, 1);
    expect(result.passed).toBe(true);
  });

  it("引泉入户：git clone 可通关", () => {
    const level = ALL_LEVELS.find((item) => item.title === "引泉入户");
    expect(level).toBeDefined();
    const cloneResult = gitEngine.executeCommand(
      "git clone https://gitgame.local/demo.git .",
      level!.initialState,
    );
    const result = judge.evaluate(cloneResult.state, level!.goal, level!.constraints, 1);
    expect(result.passed).toBe(true);
  });

  it("只取不并：fetch 不移动本地 main", () => {
    const level = ALL_LEVELS.find((item) => item.title === "只取不并");
    expect(level).toBeDefined();
    const fetchResult = gitEngine.executeCommand("git fetch origin", level!.initialState);
    expect(fetchResult.success).toBe(true);
    expect(fetchResult.state.branches.main).toBe("r3base");
    expect(fetchResult.state.remoteTracking?.["origin/main"]).toBe("r3new");
    const result = judge.evaluate(fetchResult.state, level!.goal, level!.constraints, 1);
    expect(result.passed).toBe(true);
  });

  it("拉取合流：pull 可快进本地 main", () => {
    const level = ALL_LEVELS.find((item) => item.title === "拉取合流");
    expect(level).toBeDefined();
    const pullResult = gitEngine.executeCommand("git pull origin main", level!.initialState);
    expect(pullResult.success).toBe(true);
    const result = judge.evaluate(pullResult.state, level!.goal, level!.constraints, 1);
    expect(result.passed).toBe(true);
  });

  it("拒推送先合：push 被拒后 pull 再 push 可通关", () => {
    const level = ALL_LEVELS.find((item) => item.title === "拒推送先合");
    expect(level).toBeDefined();
    const pushFail = gitEngine.executeCommand("git push origin main", level!.initialState);
    expect(pushFail.success).toBe(false);

    const pullResult = gitEngine.executeCommand("git pull origin main", level!.initialState);
    expect(pullResult.success).toBe(true);

    const pushOk = gitEngine.executeCommand("git push origin main", pullResult.state);
    expect(pushOk.success).toBe(true);

    const result = judge.evaluate(pushOk.state, level!.goal, level!.constraints, 3);
    expect(result.passed).toBe(true);
  });

  it("先看再选：diff 后 add 可通关", () => {
    const level = ALL_LEVELS.find((item) => item.title === "先看再选");
    expect(level).toBeDefined();
    const diffResult = gitEngine.executeCommand("git diff", level!.initialState);
    expect(diffResult.success).toBe(true);
    const addResult = gitEngine.executeCommand("git add app.js", diffResult.state);
    const result = judge.evaluate(addResult.state, level!.goal, level!.constraints, 2);
    expect(result.passed).toBe(true);
  });

  it("纯净快照：git add . 提交 junk.txt 时不应通关", () => {
    const level = ALL_LEVELS.find((item) => item.title === "纯净快照");
    expect(level).toBeDefined();

    const addAll = gitEngine.executeCommand("git add .", level!.initialState);
    const commitAll = gitEngine.executeCommand('git commit -m "demo"', addAll.state);
    const result = judge.evaluate(commitAll.state, level!.goal, level!.constraints, 2);

    expect(result.passed).toBe(false);
    expect(result.gaps.some((gap) => gap.key === "filesAbsentFromHead:junk.txt")).toBe(true);
  });

  it("纯净快照：只提交 app.js 时应通关", () => {
    const level = ALL_LEVELS.find((item) => item.title === "纯净快照");
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

  /** 关卡「双亲之印」：两分支各有独立提交，merge 后应同时保留双方文件 */
  it("双亲 merge 应保留 main.txt 与 feature.txt", () => {
    const twinParentState: RepoState = {
      commits: {
        base01: { id: "base01", message: "init", parents: [], files: { "readme.md": "hi" }, timestamp: 1 },
        main01: { id: "main01", message: "main change", parents: ["base01"], files: { "readme.md": "hi", "main.txt": "main only" }, timestamp: 2 },
        feat01: { id: "feat01", message: "feature change", parents: ["base01"], files: { "readme.md": "hi", "feature.txt": "feature only" }, timestamp: 3 },
      },
      branches: { main: "main01", feature: "feat01" },
      head: { type: "branch", ref: "main" },
      workingTree: {
        "readme.md": { content: "hi", status: "unchanged" },
        "main.txt": { content: "main only", status: "unchanged" },
      },
      index: {},
      conflicts: {},
      stash: [],
      tags: {},
      reflog: [],
    };
    const merged = gitEngine.executeCommand("git merge feature", twinParentState);
    expect(merged.success).toBe(true);
    const headId = merged.state.branches.main;
    const headFiles = merged.state.commits[headId].files;
    expect(headFiles["main.txt"]).toBe("main only");
    expect(headFiles["feature.txt"]).toBe("feature only");
    expect(merged.state.commits[headId].parents).toHaveLength(2);
    const judgeResult = judge.evaluate(
      merged.state,
      {
        currentBranch: "main",
        workingTreeClean: true,
        indexEmpty: true,
        noConflicts: true,
        mergeCommitRequired: true,
        branchMerged: [{ source: "feature", target: "main" }],
        fileContents: { "main.txt": "main only", "feature.txt": "feature only" },
      },
      { baseScore: 30 },
      1,
    );
    expect(judgeResult.passed).toBe(true);
  });
});

describe("resolveConflictFile", () => {
  it("清除冲突标记并更新工作区", () => {
    const state: RepoState = {
      ...baseState,
      conflicts: {
        "config.json": { base: "{}", ours: '{"env":"main"}', theirs: '{"env":"feature"}' },
      },
      workingTree: {
        "config.json": {
          content: "<<<<<<< HEAD\n{\"env\":\"main\"}\n=======\n{\"env\":\"feature\"}\n>>>>>>> feature",
          status: "modified",
        },
      },
      merging: { branch: "feature", commitId: "feat03" },
    };

    resolveConflictFile(state, "config.json", '{"env":"feature"}');
    expect(state.conflicts["config.json"]).toBeUndefined();
    expect(state.workingTree["config.json"].content).toBe('{"env":"feature"}');
  });

  it("拒绝仍含冲突标记的内容", () => {
    const state: RepoState = {
      ...baseState,
      conflicts: {
        "a.txt": { base: "x", ours: "y", theirs: "z" },
      },
    };

    expect(() => resolveConflictFile(state, "a.txt", "<<<<<<< HEAD\ny")).toThrow();
  });

  it("hasConflictMarkers 可识别标记行", () => {
    expect(hasConflictMarkers("<<<<<<< HEAD")).toBe(true);
    expect(hasConflictMarkers("clean content")).toBe(false);
  });
});
