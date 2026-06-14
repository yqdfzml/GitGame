import { Difficulty } from "@prisma/client";
import type { LevelGoal, RepoState } from "../src/git-engine/repo-state.types";

/** 关卡种子定义结构 */
export interface LevelSeed {
  courseId: string;
  chapterId: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  sortOrder: number;
  initialState: RepoState;
  goal: LevelGoal;
  constraints: { baseScore: number; stepPenalty: number; maxSteps: number; minSteps?: number };
}

/** 空仓库骨架 */
export const emptyRepoBase = (): RepoState => ({
  commits: {},
  branches: { main: "" },
  head: { type: "branch", ref: "main" },
  workingTree: {},
  index: {},
  conflicts: {},
  stash: [],
  tags: {},
  reflog: [],
});

/**
 * 创建带单个初始提交的仓库状态。
 * 功能：快速构建教学关卡初始快照。
 * 参数：branch - 分支名；commitId - 提交 id；message - 说明；files - 文件内容。
 * 返回值：完整 RepoState。
 */
export const makeRepoWithCommit = (
  branch: string,
  commitId: string,
  message: string,
  files: Record<string, string>,
): RepoState => ({
  commits: {
    [commitId]: {
      id: commitId,
      message,
      parents: [],
      files,
      timestamp: Date.now() - 10000,
    },
  },
  branches: { [branch]: commitId },
  head: { type: "branch", ref: branch },
  workingTree: Object.fromEntries(
    Object.entries(files).map(([path, content]) => [path, { content, status: "unchanged" as const }]),
  ),
  index: {},
  conflicts: {},
  stash: [],
  tags: {},
  reflog: [],
});

/** 未初始化的空目录，供 git init 关卡使用 */
export const uninitializedRepoBase = (): RepoState => ({
  initialized: false,
  commits: {},
  branches: {},
  head: { type: "branch", ref: "main" },
  workingTree: {},
  index: {},
  conflicts: {},
  stash: [],
  tags: {},
  reflog: [],
  config: {},
  remotes: {},
  remoteTracking: {},
  cloneSources: {},
});

/** 原有 40 关内容（chapterId / sortOrder 由路线表覆盖） */
const LEGACY_LEVELS: LevelSeed[] = [
  // ══ 第 1 章：初入仓境（5 关）sortOrder 1-5 ══
  {
    courseId: "mvp", chapterId: "workspace", title: "山门初开", sortOrder: 1,
    description: "welcome.txt 尚未纳入版本库，app.js 有本地修改。用 git status 辨认未跟踪与已修改，两者都保持现状。",
    difficulty: Difficulty.BEGINNER,
    initialState: {
      ...makeRepoWithCommit("main", "w0a1b2c", "init", { "app.js": "v1" }),
      workingTree: {
        "welcome.txt": { content: "欢迎来到 GitGame", status: "untracked" },
        "app.js": { content: "v2", status: "modified" },
      },
    },
    goal: { untrackedFiles: ["welcome.txt"], workingTreeContents: { "app.js": "v2" }, indexEmpty: true },
    constraints: { baseScore: 30, stepPenalty: 1, maxSteps: 10, minSteps: 1 },
  },
  {
    courseId: "mvp", chapterId: "workspace", title: "灵气扰动", sortOrder: 2,
    description: "app.js 已改为 v2。将这次修改加入暂存区，先不要提交。",
    difficulty: Difficulty.BEGINNER,
    initialState: { ...makeRepoWithCommit("main", "w1a2b3c", "init", { "app.js": "v1" }), workingTree: { "app.js": { content: "v2", status: "modified" } } },
    goal: { indexContents: { "app.js": "v2" }, workingTreeContents: { "app.js": "v2" } },
    constraints: { baseScore: 30, stepPenalty: 2, maxSteps: 15 },
  },
  {
    courseId: "mvp", chapterId: "workspace", title: "暂存之门", sortOrder: 3,
    description: "notes.md 有待提交的修改，draft.txt 是未跟踪草稿。只暂存 notes.md，draft.txt 不要纳入版本库。",
    difficulty: Difficulty.BEGINNER,
    initialState: {
      ...makeRepoWithCommit("main", "w2b3c4d", "init", { "notes.md": "旧笔记" }),
      workingTree: {
        "notes.md": { content: "新笔记内容", status: "modified" },
        "draft.txt": { content: "wip", status: "untracked" },
      },
    },
    goal: { indexContents: { "notes.md": "新笔记内容" }, workingTreeContents: { "notes.md": "新笔记内容" }, untrackedFiles: ["draft.txt"] },
    constraints: { baseScore: 30, stepPenalty: 2, maxSteps: 15 },
  },
  {
    courseId: "mvp", chapterId: "workspace", title: "三境分明", sortOrder: 4,
    description: "三份文件状态各不相同：只暂存 notes.md，app.js 保持已修改未暂存，temp.log 保持未跟踪。",
    difficulty: Difficulty.BEGINNER,
    initialState: {
      ...makeRepoWithCommit("main", "w3c4d5e", "base", { "notes.md": "旧", "app.js": "v1" }),
      workingTree: {
        "notes.md": { content: "新笔记", status: "modified" },
        "app.js": { content: "v2", status: "modified" },
        "temp.log": { content: "debug", status: "untracked" },
      },
    },
    goal: { indexContents: { "notes.md": "新笔记" }, untrackedFiles: ["temp.log"], workingTreeContents: { "app.js": "v2" } },
    constraints: { baseScore: 30, stepPenalty: 2, maxSteps: 20 },
  },
  {
    courseId: "mvp", chapterId: "workspace", title: "明镜无尘", sortOrder: 5,
    description: "app.js 被误改脏了。丢弃本地改动，使工作区回到与 HEAD 一致。",
    difficulty: Difficulty.BEGINNER,
    initialState: {
      ...makeRepoWithCommit("main", "w4d5e6f", "base", { "app.js": "clean" }),
      workingTree: { "app.js": { content: "dirty", status: "modified" } },
    },
    goal: { workingTreeClean: true, indexEmpty: true },
    constraints: { baseScore: 30, stepPenalty: 2, maxSteps: 20 },
  },

  // ══ 第 2 章：快照成印（5 关）sortOrder 6-10 ══
  {
    courseId: "mvp", chapterId: "snapshot", title: "第一枚灵印", sortOrder: 6,
    description: "README.md 有尚未提交的新内容。将这次修改正式写入 main 的历史。",
    difficulty: Difficulty.BEGINNER,
    initialState: { ...makeRepoWithCommit("main", "s1a2b3c", "init", { "README.md": "# GitGame\n" }), workingTree: { "README.md": { content: "# GitGame\n\nLearn Git.", status: "modified" } } },
    goal: { workingTreeClean: true, indexEmpty: true, currentBranch: "main", fileContents: { "README.md": "# GitGame\n\nLearn Git." } },
    constraints: { baseScore: 30, stepPenalty: 2, maxSteps: 20 },
  },
  {
    courseId: "mvp", chapterId: "snapshot", title: "只取所需", sortOrder: 7,
    description: "app.js 和 debug.log 都有改动，但只想把 app.js 的 v2 记入历史，debug.log 的修改留在本地。",
    difficulty: Difficulty.BEGINNER,
    initialState: {
      ...makeRepoWithCommit("main", "s2b3c4d", "base", { "app.js": "v1", "debug.log": "old log" }),
      workingTree: { "app.js": { content: "v2", status: "modified" }, "debug.log": { content: "new log", status: "modified" } },
    },
    goal: { fileContents: { "app.js": "v2", "debug.log": "old log" }, workingTreeContents: { "debug.log": "new log" }, indexEmpty: true },
    constraints: { baseScore: 30, stepPenalty: 2, maxSteps: 20 },
  },
  {
    courseId: "mvp", chapterId: "snapshot", title: "暂存与未暂存", sortOrder: 8,
    description: "app.js 已在暂存区，todo.txt 仍有 WIP 改动。提交已暂存部分，todo.txt 不要进历史。",
    difficulty: Difficulty.BEGINNER,
    initialState: {
      ...makeRepoWithCommit("main", "s3c4d5e", "base", { "app.js": "v1", "todo.txt": "old" }),
      index: { "app.js": "v2" },
      workingTree: { "app.js": { content: "v2", status: "modified" }, "todo.txt": { content: "wip task", status: "modified" } },
    },
    goal: { fileContents: { "app.js": "v2", "todo.txt": "old" }, workingTreeContents: { "todo.txt": "wip task" }, indexEmpty: true },
    constraints: { baseScore: 30, stepPenalty: 2, maxSteps: 15 },
  },
  {
    courseId: "mvp", chapterId: "snapshot", title: "错改回正", sortOrder: 9,
    description: "config.json 被误改为 broken，正确版本应为 mode=prod。撤销误改，使工作区恢复正确。",
    difficulty: Difficulty.BEGINNER,
    initialState: { ...makeRepoWithCommit("main", "s4d5e6f", "base", { "config.json": '{"mode":"prod"}' }), workingTree: { "config.json": { content: '{"mode":"broken"}', status: "modified" } } },
    goal: { workingTreeClean: true, indexEmpty: true, currentBranch: "main" },
    constraints: { baseScore: 30, stepPenalty: 2, maxSteps: 20 },
  },
  {
    courseId: "mvp", chapterId: "snapshot", title: "纯净快照", sortOrder: 10,
    description: "需要提交 app.js 的 v2，不要让 junk.txt 进入版本库。",
    difficulty: Difficulty.BEGINNER,
    initialState: {
      ...makeRepoWithCommit("main", "s5e6f7a", "base", { "app.js": "v1" }),
      workingTree: { "app.js": { content: "v2", status: "modified" }, "junk.txt": { content: "垃圾", status: "untracked" } },
    },
    goal: { fileContents: { "app.js": "v2" }, filesAbsentFromHead: ["junk.txt"], indexEmpty: true, currentBranch: "main" },
    constraints: { baseScore: 30, stepPenalty: 2, maxSteps: 20 },
  },

  // ══ 第 3 章：分脉立道（5 关）sortOrder 11-15 ══
  {
    courseId: "mvp", chapterId: "branch", title: "另开一脉", sortOrder: 11,
    description: "从 main 开出 feature 分支并切换过去，main 仍停留在原位。",
    difficulty: Difficulty.BEGINNER,
    initialState: makeRepoWithCommit("main", "b1a2b3c", "init project", { "app.js": "console.log('hi')" }),
    goal: { currentBranch: "feature", workingTreeClean: true, branchHeads: { main: "b1a2b3c", feature: "b1a2b3c" } },
    constraints: { baseScore: 30, stepPenalty: 2, maxSteps: 15 },
  },
  {
    courseId: "mvp", chapterId: "branch", title: "身在何处", sortOrder: 12,
    description: "当前在 feature，需要回到 main，工作区保持干净。",
    difficulty: Difficulty.BEGINNER,
    initialState: {
      ...makeRepoWithCommit("main", "b2c3d4e", "init", { "app.js": "v1" }),
      branches: { main: "b2c3d4e", feature: "b2c3d4e" },
      head: { type: "branch", ref: "feature" },
      workingTree: { "app.js": { content: "v1", status: "unchanged" } },
    },
    goal: { currentBranch: "main", workingTreeClean: true },
    constraints: { baseScore: 30, stepPenalty: 2, maxSteps: 10 },
  },
  {
    courseId: "mvp", chapterId: "branch", title: "分支独修", sortOrder: 13,
    description: "在 feature 上把 app.js 提交为 v2，main 不要动。",
    difficulty: Difficulty.BEGINNER,
    initialState: {
      ...makeRepoWithCommit("main", "b3d4e5f", "init", { "app.js": "v1" }),
      branches: { main: "b3d4e5f", feature: "b3d4e5f" },
      head: { type: "branch", ref: "feature" },
      workingTree: { "app.js": { content: "v2", status: "modified" } },
    },
    goal: { currentBranch: "feature", workingTreeClean: true, indexEmpty: true, branchHeads: { main: "b3d4e5f" }, fileContents: { "app.js": "v2" } },
    constraints: { baseScore: 30, stepPenalty: 2, maxSteps: 20 },
  },
  {
    courseId: "mvp", chapterId: "branch", title: "错路回头", sortOrder: 14,
    description: "你在 hotfix 上误改了 app.js。切到正确分支并完成提交，main 与 hotfix 保持不动。",
    difficulty: Difficulty.BEGINNER,
    initialState: {
      ...makeRepoWithCommit("main", "b4e5f6a", "init", { "app.js": "v1" }),
      branches: { main: "b4e5f6a", feature: "b4e5f6a", hotfix: "b4e5f6a" },
      head: { type: "branch", ref: "hotfix" },
      workingTree: { "app.js": { content: "feature-fix", status: "modified" } },
    },
    goal: { currentBranch: "feature", workingTreeClean: true, fileContents: { "app.js": "feature-fix" }, branchHeads: { main: "b4e5f6a", hotfix: "b4e5f6a" } },
    constraints: { baseScore: 30, stepPenalty: 2, maxSteps: 25 },
  },
  {
    courseId: "mvp", chapterId: "branch", title: "双脉并行", sortOrder: 15,
    description: "先在 main 提交工作区中已修改的 main.txt，再到 feature 新建 feature.txt（内容为 f1）并提交。",
    difficulty: Difficulty.BEGINNER,
    initialState: {
      ...makeRepoWithCommit("main", "b5f6a7b", "init", { "app.js": "base", "main.txt": "m0" }),
      branches: { main: "b5f6a7b", feature: "b5f6a7b" },
      head: { type: "branch", ref: "main" },
      workingTree: { "app.js": { content: "base", status: "unchanged" }, "main.txt": { content: "m1", status: "modified" } },
    },
    goal: { currentBranch: "feature", workingTreeClean: true, fileContents: { "feature.txt": "f1" }, branchFileContents: { main: { "main.txt": "m1" } }, branchContains: [{ branch: "main", commit: "b5f6a7b" }] },
    constraints: { baseScore: 30, stepPenalty: 3, maxSteps: 30 },
  },

  // ══ 第 4 章：合流破障（5 关）sortOrder 16-20 ══
  {
    courseId: "mvp", chapterId: "merge", title: "顺水合流", sortOrder: 16,
    description: "feature 领先 main。在 main 上完成合并，最终 app.js 应为 feature 的内容。",
    difficulty: Difficulty.INTERMEDIATE,
    initialState: {
      commits: {
        m1: { id: "m1", message: "main init", parents: [], files: { "app.js": "main" }, timestamp: 1 },
        f1: { id: "f1", message: "feature work", parents: ["m1"], files: { "app.js": "feature" }, timestamp: 2 },
      },
      branches: { main: "m1", feature: "f1" }, head: { type: "branch", ref: "main" },
      workingTree: { "app.js": { content: "main", status: "unchanged" } }, index: {}, conflicts: {}, stash: [], tags: {}, reflog: [],
    },
    goal: { currentBranch: "main", workingTreeClean: true, indexEmpty: true, noConflicts: true, branchMerged: [{ source: "feature", target: "main" }], fileContents: { "app.js": "feature" } },
    constraints: { baseScore: 30, stepPenalty: 3, maxSteps: 30 },
  },
  {
    courseId: "mvp", chapterId: "merge", title: "双亲之印", sortOrder: 17,
    description: "工作区已有 main.txt，在 main 提交；再到 feature 新建 feature.txt（内容为 feature only）并提交；最后回到 main 合并，两边文件均保留。",
    difficulty: Difficulty.INTERMEDIATE,
    initialState: {
      ...makeRepoWithCommit("main", "base01", "init", { "readme.md": "hi" }),
      branches: { main: "base01", feature: "base01" },
      head: { type: "branch", ref: "main" },
      workingTree: {
        "readme.md": { content: "hi", status: "unchanged" },
        "main.txt": { content: "main only", status: "untracked" },
      },
    },
    goal: {
      currentBranch: "main",
      workingTreeClean: true,
      indexEmpty: true,
      noConflicts: true,
      mergeCommitRequired: true,
      branchMerged: [{ source: "feature", target: "main" }],
      branchContains: [{ branch: "main", commit: "base01" }],
      branchFileContents: { feature: { "feature.txt": "feature only" } },
      fileContents: { "main.txt": "main only", "feature.txt": "feature only" },
    },
    constraints: { baseScore: 30, stepPenalty: 3, maxSteps: 35 },
  },
  {
    courseId: "mvp", chapterId: "merge", title: "同文相争", sortOrder: 18,
    description: "两分支改了 doc.md 的不同行，Git 会自动合并（不会产生冲突），合并后 doc.md 应同时包含 LINE1 与 LINE3。",
    difficulty: Difficulty.INTERMEDIATE,
    initialState: {
      commits: {
        base02: { id: "base02", message: "init", parents: [], files: { "doc.md": "line1\nline2\nline3" }, timestamp: 1 },
        main02: { id: "main02", message: "edit line1", parents: ["base02"], files: { "doc.md": "LINE1\nline2\nline3" }, timestamp: 2 },
        feat02: { id: "feat02", message: "edit line3", parents: ["base02"], files: { "doc.md": "line1\nline2\nLINE3" }, timestamp: 3 },
      },
      branches: { main: "main02", feature: "feat02" }, head: { type: "branch", ref: "main" },
      workingTree: { "doc.md": { content: "LINE1\nline2\nline3", status: "unchanged" } }, index: {}, conflicts: {}, stash: [], tags: {}, reflog: [],
    },
    goal: { currentBranch: "main", workingTreeClean: true, indexEmpty: true, noConflicts: true, branchMerged: [{ source: "feature", target: "main" }], fileContents: { "doc.md": "LINE1\nline2\nLINE3" } },
    constraints: { baseScore: 30, stepPenalty: 3, maxSteps: 30 },
  },
  {
    courseId: "mvp", chapterId: "merge", title: "冲突调和", sortOrder: 19,
    description: "合并 feature 时 config.json 发生冲突，保留 feature 侧的配置并完成合并。",
    difficulty: Difficulty.INTERMEDIATE,
    initialState: {
      commits: {
        base03: { id: "base03", message: "init", parents: [], files: { "config.json": '{"port":3000}' }, timestamp: 1 },
        main03: { id: "main03", message: "main port", parents: ["base03"], files: { "config.json": '{"port":3000,"env":"main"}' }, timestamp: 2 },
        feat03: { id: "feat03", message: "feature port", parents: ["base03"], files: { "config.json": '{"port":3000,"env":"feature"}' }, timestamp: 3 },
      },
      branches: { main: "main03", feature: "feat03" }, head: { type: "branch", ref: "main" },
      workingTree: { "config.json": { content: '{"port":3000,"env":"main"}', status: "unchanged" } }, index: {}, conflicts: {}, stash: [], tags: {}, reflog: [],
    },
    goal: { currentBranch: "main", workingTreeClean: true, indexEmpty: true, noConflicts: true, mergeCommitRequired: true, branchMerged: [{ source: "feature", target: "main" }], fileContents: { "config.json": '{"port":3000,"env":"feature"}' } },
    constraints: { baseScore: 30, stepPenalty: 3, maxSteps: 40 },
  },
  {
    courseId: "mvp", chapterId: "merge", title: "合而不乱", sortOrder: 20,
    description: "合并 feature：config.json 取 feature 版，readme.md 应自动变为 hello。",
    difficulty: Difficulty.INTERMEDIATE,
    initialState: {
      commits: {
        base04: { id: "base04", message: "init", parents: [], files: { "config.json": "v0", "readme.md": "hi" }, timestamp: 1 },
        main04: { id: "main04", message: "main", parents: ["base04"], files: { "config.json": "main-v", "readme.md": "hi" }, timestamp: 2 },
        feat04: { id: "feat04", message: "feature", parents: ["base04"], files: { "config.json": "feat-v", "readme.md": "hello" }, timestamp: 3 },
      },
      branches: { main: "main04", feature: "feat04" }, head: { type: "branch", ref: "main" },
      workingTree: { "config.json": { content: "main-v", status: "unchanged" }, "readme.md": { content: "hi", status: "unchanged" } },
      index: {}, conflicts: {}, stash: [], tags: {}, reflog: [],
    },
    goal: { currentBranch: "main", workingTreeClean: true, indexEmpty: true, noConflicts: true, mergeCommitRequired: true, branchMerged: [{ source: "feature", target: "main" }], fileContents: { "config.json": "feat-v", "readme.md": "hello" } },
    constraints: { baseScore: 30, stepPenalty: 3, maxSteps: 40 },
  },

  // ══ 第 5 章：回溯补过（5 关）sortOrder 21-25 ══
  {
    courseId: "mvp", chapterId: "undo", title: "撤回暂存", sortOrder: 21,
    description: "secret.key 被误加入暂存区。取消暂存，但保留工作区里的 new-secret。",
    difficulty: Difficulty.INTERMEDIATE,
    initialState: {
      ...makeRepoWithCommit("main", "u1a2b3c", "base", { "secret.key": "old-secret" }),
      index: { "secret.key": "new-secret" },
      workingTree: { "secret.key": { content: "new-secret", status: "modified" } },
    },
    goal: { indexEmpty: true, workingTreeContents: { "secret.key": "new-secret" }, currentBranch: "main" },
    constraints: { baseScore: 30, stepPenalty: 2, maxSteps: 15 },
  },
  {
    courseId: "mvp", chapterId: "undo", title: "抹去误改", sortOrder: 22,
    description: "app.js 工作区被改成 wrong，HEAD 中是 correct。恢复为 HEAD 的内容。",
    difficulty: Difficulty.INTERMEDIATE,
    initialState: { ...makeRepoWithCommit("main", "u2b3c4d", "base", { "app.js": "correct" }), workingTree: { "app.js": { content: "wrong", status: "modified" } } },
    goal: { workingTreeClean: true, currentBranch: "main" },
    constraints: { baseScore: 30, stepPenalty: 2, maxSteps: 15 },
  },
  {
    courseId: "mvp", chapterId: "undo", title: "重做一印", sortOrder: 23,
    description: "最新提交不完整。撤销这次提交，把 app.js 改为 v2 后重新提交一次。",
    difficulty: Difficulty.INTERMEDIATE,
    initialState: {
      commits: {
        g01: { id: "g01", message: "good base", parents: [], files: { "app.js": "v1" }, timestamp: 1 },
        bad1: { id: "bad1", message: "incomplete", parents: ["g01"], files: { "app.js": "v1" }, timestamp: 2 },
      },
      branches: { main: "bad1" }, head: { type: "branch", ref: "main" },
      workingTree: { "app.js": { content: "v1", status: "unchanged" } }, index: {}, conflicts: {}, stash: [], tags: {}, reflog: [],
    },
    goal: { fileContents: { "app.js": "v2" }, workingTreeClean: true, indexEmpty: true, commitsExist: ["g01"], branchNotContains: [{ branch: "main", commit: "bad1" }] },
    constraints: { baseScore: 30, stepPenalty: 3, maxSteps: 25 },
  },
  {
    courseId: "mvp", chapterId: "undo", title: "公开补过", sortOrder: 24,
    description: "config.json 因某次错误提交变成了 debug:true，需要在不抹历史的前提下恢复为 debug:false。",
    difficulty: Difficulty.INTERMEDIATE,
    initialState: {
      commits: {
        g02: { id: "g02", message: "good", parents: [], files: { "config.json": '{"debug":false}' }, timestamp: 1 },
        b02: { id: "b02", message: "bad change", parents: ["g02"], files: { "config.json": '{"debug":true}' }, timestamp: 2 },
      },
      branches: { main: "b02" }, head: { type: "branch", ref: "main" },
      workingTree: { "config.json": { content: '{"debug":true}', status: "unchanged" } }, index: {}, conflicts: {}, stash: [], tags: {}, reflog: [],
    },
    goal: { fileContents: { "config.json": '{"debug":false}' }, workingTreeClean: true, commitsExist: ["g02", "b02"], branchContains: [{ branch: "main", commit: "b02" }] },
    constraints: { baseScore: 30, stepPenalty: 3, maxSteps: 25 },
  },
  {
    courseId: "mvp", chapterId: "undo", title: "错误归位", sortOrder: 25,
    description: "main 误到了错误提交，应恢复到 good 那次提交的状态；topic 分支上的错误提交要保留。",
    difficulty: Difficulty.INTERMEDIATE,
    initialState: {
      commits: {
        g03: { id: "g03", message: "good", parents: [], files: { "app.js": "ok" }, timestamp: 1 },
        bad3: { id: "bad3", message: "wrong", parents: ["g03"], files: { "app.js": "broken" }, timestamp: 2 },
      },
      branches: { main: "bad3", topic: "bad3" }, head: { type: "branch", ref: "main" },
      workingTree: { "app.js": { content: "broken", status: "unchanged" } }, index: {}, conflicts: {}, stash: [], tags: {}, reflog: [],
    },
    goal: { currentBranch: "main", branchHeads: { main: "g03", topic: "bad3" }, fileContents: { "app.js": "ok" }, workingTreeClean: true },
    constraints: { baseScore: 30, stepPenalty: 3, maxSteps: 25 },
  },

  // ══ 第 6 章：藏锋转身（5 关）sortOrder 26-30 ══
  {
    courseId: "mvp", chapterId: "stash", title: "临时收功", sortOrder: 26,
    description: "feature 上 app.js 有 WIP。先收好改动，再切到 hotfix，工作区需干净。",
    difficulty: Difficulty.INTERMEDIATE,
    initialState: {
      commits: {
        st0base: { id: "st0base", message: "init", parents: [], files: { "app.js": "stable" }, timestamp: 1 },
        st0feat: { id: "st0feat", message: "feature wip", parents: ["st0base"], files: { "app.js": "stable" }, timestamp: 2 },
      },
      branches: { main: "st0base", feature: "st0feat", hotfix: "st0base" },
      head: { type: "branch", ref: "feature" },
      workingTree: { "app.js": { content: "wip-change", status: "modified" } }, index: {}, conflicts: {}, stash: [], tags: {}, reflog: [],
    },
    goal: { currentBranch: "hotfix", workingTreeClean: true, stashContents: { "app.js": "wip-change" } },
    constraints: { baseScore: 30, stepPenalty: 3, maxSteps: 20 },
  },
  {
    courseId: "mvp", chapterId: "stash", title: "急救主线", sortOrder: 27,
    description: "feature 上有 WIP。先处理 main 上 version.txt 紧急更新为 1.0.1，再回到 feature 恢复 WIP。",
    difficulty: Difficulty.INTERMEDIATE,
    initialState: {
      commits: { st1base: { id: "st1base", message: "init", parents: [], files: { "app.js": "stable", "version.txt": "1.0" }, timestamp: 1 } },
      branches: { main: "st1base", feature: "st1base" }, head: { type: "branch", ref: "feature" },
      workingTree: { "app.js": { content: "wip", status: "modified" } }, index: {}, conflicts: {}, stash: [], tags: {}, reflog: [],
    },
    goal: { fileContents: { "version.txt": "1.0.1" }, workingTreeContents: { "app.js": "wip" }, currentBranch: "feature" },
    constraints: { baseScore: 30, stepPenalty: 3, maxSteps: 30 },
  },
  {
    courseId: "mvp", chapterId: "stash", title: "藏而不失", sortOrder: 28,
    description: "stash 里存了两份改动，恢复较早那份，使 app.js 变为 first-wip。",
    difficulty: Difficulty.INTERMEDIATE,
    initialState: {
      ...makeRepoWithCommit("main", "st2base", "init", { "app.js": "base" }),
      stash: [
        { id: "stash@{0}", message: "second", workingTree: { "app.js": { content: "second-wip", status: "modified" } }, index: {} },
        { id: "stash@{1}", message: "first", workingTree: { "app.js": { content: "first-wip", status: "modified" } }, index: {} },
      ],
    },
    goal: { workingTreeContents: { "app.js": "first-wip" }, indexEmpty: true },
    constraints: { baseScore: 30, stepPenalty: 3, maxSteps: 25 },
  },
  {
    courseId: "mvp", chapterId: "stash", title: "立碑记名", sortOrder: 29,
    description: "release v1.0 已提交，给这个版本打上 v1.0 标签。",
    difficulty: Difficulty.INTERMEDIATE,
    initialState: {
      commits: {
        st3base: { id: "st3base", message: "init", parents: [], files: { "version.txt": "0.9" }, timestamp: 1 },
        st3rel: { id: "st3rel", message: "release v1.0", parents: ["st3base"], files: { "version.txt": "1.0" }, timestamp: 2 },
      },
      branches: { main: "st3rel" }, head: { type: "branch", ref: "main" },
      workingTree: { "version.txt": { content: "1.0", status: "unchanged" } }, index: {}, conflicts: {}, stash: [], tags: {}, reflog: [],
    },
    goal: { requiredTags: { "v1.0": "st3rel" }, workingTreeClean: true },
    constraints: { baseScore: 30, stepPenalty: 2, maxSteps: 15 },
  },
  {
    courseId: "mvp", chapterId: "stash", title: "版本归档", sortOrder: 30,
    description: "历史上有多次修复尝试，找到真正修好 app.js 的那次提交，打上 release 标签。",
    difficulty: Difficulty.INTERMEDIATE,
    initialState: {
      commits: {
        st4a: { id: "st4a", message: "init", parents: [], files: { "app.js": "broken" }, timestamp: 1 },
        st4b: { id: "st4b", message: "attempt", parents: ["st4a"], files: { "app.js": "still-broken" }, timestamp: 2 },
        st4c: { id: "st4c", message: "real fix", parents: ["st4b"], files: { "app.js": "fixed" }, timestamp: 3 },
      },
      branches: { main: "st4c" }, head: { type: "branch", ref: "main" },
      workingTree: { "app.js": { content: "fixed", status: "unchanged" } }, index: {}, conflicts: {}, stash: [], tags: {}, reflog: [],
    },
    goal: { requiredTags: { release: "st4c" }, fileContents: { "app.js": "fixed" } },
    constraints: { baseScore: 30, stepPenalty: 2, maxSteps: 20 },
  },

  // ══ 第 7 章：摘星移火（5 关）sortOrder 31-35 ══
  {
    courseId: "mvp", chapterId: "cherry-pick", title: "摘一颗星", sortOrder: 31,
    description: "feature 上有修复提交，main 需要 app.js=fixed，但不要整条合并 feature。",
    difficulty: Difficulty.ADVANCED,
    initialState: {
      commits: {
        cp1base: { id: "cp1base", message: "init", parents: [], files: { "app.js": "main" }, timestamp: 1 },
        cp1feat: { id: "cp1feat", message: "feature base", parents: ["cp1base"], files: { "app.js": "main" }, timestamp: 2 },
        fix01: { id: "fix01", message: "fix bug", parents: ["cp1feat"], files: { "app.js": "fixed" }, timestamp: 3 },
      },
      branches: { main: "cp1base", feature: "fix01" }, head: { type: "branch", ref: "main" },
      workingTree: { "app.js": { content: "main", status: "unchanged" } }, index: {}, conflicts: {}, stash: [], tags: {}, reflog: [],
    },
    goal: { currentBranch: "main", workingTreeClean: true, fileContents: { "app.js": "fixed" }, branchContains: [{ branch: "main", commit: "cp1base" }], branchNotContains: [{ branch: "main", commit: "fix01" }] },
    constraints: { baseScore: 30, stepPenalty: 3, maxSteps: 25 },
  },
  {
    courseId: "mvp", chapterId: "cherry-pick", title: "错峰移植", sortOrder: 32,
    description: "只要 fix02 的修复效果到 main，不要把 bad02 的历史带过来。",
    difficulty: Difficulty.ADVANCED,
    initialState: {
      commits: {
        cp2base: { id: "cp2base", message: "init", parents: [], files: { "app.js": "main" }, timestamp: 1 },
        bad02: { id: "bad02", message: "bad", parents: ["cp2base"], files: { "app.js": "broken" }, timestamp: 2 },
        fix02: { id: "fix02", message: "fix", parents: ["bad02"], files: { "app.js": "fixed" }, timestamp: 3 },
      },
      branches: { main: "cp2base", feature: "fix02" }, head: { type: "branch", ref: "main" },
      workingTree: { "app.js": { content: "main", status: "unchanged" } }, index: {}, conflicts: {}, stash: [], tags: {}, reflog: [],
    },
    goal: { fileContents: { "app.js": "fixed" }, commitsExist: ["cp2base", "bad02"], branchContains: [{ branch: "main", commit: "cp2base" }], branchNotContains: [{ branch: "main", commit: "bad02" }, { branch: "main", commit: "fix02" }] },
    constraints: { baseScore: 30, stepPenalty: 3, maxSteps: 30 },
  },
  {
    courseId: "mvp", chapterId: "cherry-pick", title: "追上主脉", sortOrder: 33,
    description: "feature 落后于 main。让 feature 追上 main 的最新进展，并保持 app.js=feat-v。",
    difficulty: Difficulty.ADVANCED,
    initialState: {
      commits: {
        rb1base: { id: "rb1base", message: "init", parents: [], files: { "app.js": "v0" }, timestamp: 1 },
        rb1main: { id: "rb1main", message: "main update", parents: ["rb1base"], files: { "app.js": "main-v" }, timestamp: 2 },
        rb1feat: { id: "rb1feat", message: "feature work", parents: ["rb1base"], files: { "app.js": "feat-v" }, timestamp: 3 },
      },
      branches: { main: "rb1main", feature: "rb1feat" }, head: { type: "branch", ref: "feature" },
      workingTree: { "app.js": { content: "feat-v", status: "unchanged" } }, index: {}, conflicts: {}, stash: [], tags: {}, reflog: [],
    },
    goal: { currentBranch: "feature", fileContents: { "app.js": "feat-v" }, branchContains: [{ branch: "feature", commit: "rb1main" }], branchNotContains: [{ branch: "feature", commit: "rb1feat" }] },
    constraints: { baseScore: 30, stepPenalty: 3, maxSteps: 30 },
  },
  {
    courseId: "mvp", chapterId: "cherry-pick", title: "整理三印", sortOrder: 34,
    description: "main 上连续三个零散提交应合并为一条语义清晰的记录，内容保持 app.js=v3。",
    difficulty: Difficulty.ADVANCED,
    initialState: {
      commits: {
        sq1: { id: "sq1", message: "init", parents: [], files: { "app.js": "v0" }, timestamp: 1 },
        sq2: { id: "sq2", message: "wip1", parents: ["sq1"], files: { "app.js": "v1" }, timestamp: 2 },
        sq3: { id: "sq3", message: "wip2", parents: ["sq2"], files: { "app.js": "v2" }, timestamp: 3 },
        sq4: { id: "sq4", message: "wip3", parents: ["sq3"], files: { "app.js": "v3" }, timestamp: 4 },
      },
      branches: { main: "sq4" }, head: { type: "branch", ref: "main" },
      workingTree: { "app.js": { content: "v3", status: "unchanged" } }, index: {}, conflicts: {}, stash: [], tags: {}, reflog: [],
    },
    goal: { currentBranch: "main", fileContents: { "app.js": "v3" }, workingTreeClean: true, indexEmpty: true, commitsExist: ["sq1"], branchContains: [{ branch: "main", commit: "sq1" }], branchNotContains: [{ branch: "main", commit: "sq2" }, { branch: "main", commit: "sq3" }, { branch: "main", commit: "sq4" }] },
    constraints: { baseScore: 30, stepPenalty: 3, maxSteps: 25 },
  },
  {
    courseId: "mvp", chapterId: "cherry-pick", title: "移植解冲突", sortOrder: 35,
    description: "feature 需要基于最新 main 重新整理历史，解决 app.js 冲突后完成。",
    difficulty: Difficulty.ADVANCED,
    initialState: {
      commits: {
        rb2base: { id: "rb2base", message: "init", parents: [], files: { "app.js": "base" }, timestamp: 1 },
        rb2main: { id: "rb2main", message: "main", parents: ["rb2base"], files: { "app.js": "main-version" }, timestamp: 2 },
        rb2feat: { id: "rb2feat", message: "feature", parents: ["rb2base"], files: { "app.js": "feat-version" }, timestamp: 3 },
      },
      branches: { main: "rb2main", feature: "rb2feat" }, head: { type: "branch", ref: "feature" },
      workingTree: { "app.js": { content: "feat-version", status: "unchanged" } }, index: {}, conflicts: {}, stash: [], tags: {}, reflog: [],
    },
    goal: { currentBranch: "feature", fileContents: { "app.js": "feat-version" }, branchContains: [{ branch: "feature", commit: "rb2main" }], branchNotContains: [{ branch: "feature", commit: "rb2feat" }], noConflicts: true, workingTreeClean: true },
    constraints: { baseScore: 30, stepPenalty: 3, maxSteps: 40 },
  },

  // ══ 第 8 章：断案寻因（5 关）sortOrder 36-40 ══
  {
    courseId: "mvp", chapterId: "debug", title: "追溯因果", sortOrder: 36,
    description: "app.js 当前是 broken。找出引入问题的提交并安全撤销其影响，恢复为 ok。",
    difficulty: Difficulty.ADVANCED,
    initialState: {
      commits: {
        d36g: { id: "d36g", message: "good", parents: [], files: { "app.js": "ok" }, timestamp: 1 },
        d36b: { id: "d36b", message: "introduce bug", parents: ["d36g"], files: { "app.js": "broken" }, timestamp: 2 },
        d36h: { id: "d36h", message: "other", parents: ["d36b"], files: { "app.js": "broken" }, timestamp: 3 },
      },
      branches: { main: "d36h" }, head: { type: "branch", ref: "main" },
      workingTree: { "app.js": { content: "broken", status: "unchanged" } }, index: {}, conflicts: {}, stash: [], tags: {}, reflog: [],
    },
    goal: { fileContents: { "app.js": "ok" }, workingTreeClean: true, commitsExist: ["d36g", "d36b", "d36h"], branchContains: [{ branch: "main", commit: "d36h" }] },
    constraints: { baseScore: 30, stepPenalty: 3, maxSteps: 30 },
  },
  {
    courseId: "mvp", chapterId: "debug", title: "二分问道", sortOrder: 37,
    description: "历史里 good 与 bad 之间出现了首个问题提交，把它定位出来。",
    difficulty: Difficulty.ADVANCED,
    initialState: {
      commits: {
        d37g: { id: "d37g", message: "good", parents: [], files: { "app.js": "ok" }, timestamp: 1 },
        d37b: { id: "d37b", message: "first bad", parents: ["d37g"], files: { "app.js": "bad" }, timestamp: 2 },
        d37h: { id: "d37h", message: "later bad", parents: ["d37b"], files: { "app.js": "worse" }, timestamp: 3 },
      },
      branches: { main: "d37h" }, head: { type: "branch", ref: "main" },
      workingTree: { "app.js": { content: "worse", status: "unchanged" } }, index: {}, conflicts: {}, stash: [], tags: {}, reflog: [],
    },
    goal: { bisectFound: "d37b" },
    constraints: { baseScore: 30, stepPenalty: 3, maxSteps: 40 },
  },
  {
    courseId: "mvp", chapterId: "debug", title: "失足可返", sortOrder: 38,
    description: "main 被误 reset 到了旧版本，恢复到误操作之前的 good 状态。",
    difficulty: Difficulty.ADVANCED,
    initialState: {
      commits: {
        d38old: { id: "d38old", message: "old", parents: [], files: { "app.js": "old" }, timestamp: 1 },
        d38good: { id: "d38good", message: "good", parents: ["d38old"], files: { "app.js": "good" }, timestamp: 2 },
      },
      branches: { main: "d38old" }, head: { type: "branch", ref: "main" },
      workingTree: { "app.js": { content: "old", status: "unchanged" } },
      index: {}, conflicts: {}, stash: [], tags: {},
      reflog: [
        { commitId: "d38good", message: "commit: good", branch: "main" },
        { commitId: "d38old", message: "reset: moving to d38old", branch: "main" },
      ],
    },
    goal: { branchHeads: { main: "d38good" }, fileContents: { "app.js": "good" }, workingTreeClean: true },
    constraints: { baseScore: 30, stepPenalty: 3, maxSteps: 20 },
  },
  {
    courseId: "mvp", chapterId: "debug", title: "断线续命", sortOrder: 39,
    description: "feature 分支被误删了，从操作记录里找回它的最新提交并重建分支。",
    difficulty: Difficulty.ADVANCED,
    initialState: {
      commits: {
        d39base: { id: "d39base", message: "init", parents: [], files: { "app.js": "base" }, timestamp: 1 },
        d39feat: { id: "d39feat", message: "feature work", parents: ["d39base"], files: { "app.js": "feature" }, timestamp: 2 },
      },
      branches: { main: "d39base" }, head: { type: "branch", ref: "main" },
      workingTree: { "app.js": { content: "base", status: "unchanged" } },
      index: {}, conflicts: {}, stash: [], tags: {},
      reflog: [{ commitId: "d39feat", message: "commit: feature work", branch: "feature" }],
    },
    goal: { branchHeads: { feature: "d39feat" }, fileContents: { "app.js": "base" } },
    constraints: { baseScore: 30, stepPenalty: 3, maxSteps: 20 },
  },
  {
    courseId: "mvp", chapterId: "debug", title: "终局试炼", sortOrder: 40,
    description: "依次完成：撤销 bad 提交的影响、合入 hotfix 修复、为 v2.0 版本打标签。",
    difficulty: Difficulty.ADVANCED,
    initialState: {
      commits: {
        d40base: { id: "d40base", message: "init", parents: [], files: { "app.js": "v1", "version.txt": "1.0" }, timestamp: 1 },
        d40bad: { id: "d40bad", message: "bad", parents: ["d40base"], files: { "app.js": "broken", "version.txt": "1.0" }, timestamp: 2 },
        d40fix: { id: "d40fix", message: "hotfix", parents: ["d40base"], files: { "app.js": "v1", "version.txt": "2.0" }, timestamp: 3 },
      },
      branches: { main: "d40bad", hotfix: "d40fix" }, head: { type: "branch", ref: "main" },
      workingTree: { "app.js": { content: "broken", status: "unchanged" }, "version.txt": { content: "1.0", status: "unchanged" } },
      index: {}, conflicts: {}, stash: [], tags: {}, reflog: [],
    },
    goal: {
      fileContents: { "app.js": "v1", "version.txt": "2.0" },
      requiredTags: { "v2.0": "d40fix" },
      currentBranch: "main",
      workingTreeClean: true,
      noConflicts: true,
      mergeCommitRequired: true,
      branchMerged: [{ source: "hotfix", target: "main" }],
      branchContains: [{ branch: "main", commit: "d40bad" }],
      commitsExist: ["d40base", "d40bad"],
    },
    constraints: { baseScore: 30, stepPenalty: 3, maxSteps: 50 },
  },
];

/** 新增关卡：setup / snapshot-diff / history / remote */
const NEW_LEVEL_SEEDS: LevelSeed[] = [
  {
    courseId: "mvp",
    chapterId: "setup",
    title: "署名立传",
    sortOrder: 0,
    description: "提交会记录作者信息。设置 user.name 与 user.email，为后续 commit 做准备。",
    difficulty: Difficulty.BEGINNER,
    initialState: {
      ...makeRepoWithCommit("main", "setup01", "init", { "README.md": "# hi" }),
      config: {},
    },
    goal: {
      configContents: {
        "user.name": "GitGame Player",
        "user.email": "player@gitgame.local",
      },
    },
    constraints: { baseScore: 30, stepPenalty: 1, maxSteps: 10, minSteps: 2 },
  },
  {
    courseId: "mvp",
    chapterId: "setup",
    title: "空仓起手",
    sortOrder: 0,
    description: "当前目录还不是 Git 仓库。执行 git init，创建 main 分支与空版本库。",
    difficulty: Difficulty.BEGINNER,
    initialState: uninitializedRepoBase(),
    goal: {
      initialized: true,
      branchHeads: { main: "" },
      workingTreeClean: true,
      indexEmpty: true,
    },
    constraints: { baseScore: 30, stepPenalty: 1, maxSteps: 10, minSteps: 1 },
  },
  {
    courseId: "mvp",
    chapterId: "snapshot",
    title: "先看再选",
    sortOrder: 0,
    description: "app.js 与 notes.txt 都有改动。先用 git diff 看清差异，再只暂存 app.js。",
    difficulty: Difficulty.BEGINNER,
    initialState: {
      ...makeRepoWithCommit("main", "diff01", "base", { "app.js": "v1", "notes.txt": "old" }),
      workingTree: {
        "app.js": { content: "v2", status: "modified" },
        "notes.txt": { content: "new note", status: "modified" },
      },
    },
    goal: {
      indexContents: { "app.js": "v2" },
      workingTreeContents: { "app.js": "v2", "notes.txt": "new note" },
    },
    constraints: { baseScore: 30, stepPenalty: 2, maxSteps: 15, minSteps: 2 },
  },
  {
    courseId: "mvp",
    chapterId: "history",
    title: "史海钩沉",
    sortOrder: 0,
    description: "历史中有三次提交，其中一条 message 为 feature api。用 git log 与 git show 观察，本关不要改动仓库状态。",
    difficulty: Difficulty.BEGINNER,
    initialState: {
      commits: {
        h1: { id: "h1", message: "init", parents: [], files: { "app.js": "v0" }, timestamp: 1 },
        h2: { id: "h2", message: "feature api", parents: ["h1"], files: { "app.js": "v1" }, timestamp: 2 },
        h3: { id: "h3", message: "fix typo", parents: ["h2"], files: { "app.js": "v1" }, timestamp: 3 },
      },
      branches: { main: "h3" },
      head: { type: "branch", ref: "main" },
      workingTree: { "app.js": { content: "v1", status: "unchanged" } },
      index: {},
      conflicts: {},
      stash: [],
      tags: {},
      reflog: [],
    },
    goal: {
      branchHeads: { main: "h3" },
      workingTreeClean: true,
      indexEmpty: true,
    },
    constraints: { baseScore: 30, stepPenalty: 1, maxSteps: 10, minSteps: 2 },
  },
  {
    courseId: "mvp",
    chapterId: "remote",
    title: "引泉入户",
    sortOrder: 0,
    description: "从 https://gitgame.local/demo.git 克隆远程仓库，得到 README.md 与 origin 远程。",
    difficulty: Difficulty.INTERMEDIATE,
    initialState: {
      initialized: false,
      commits: {},
      branches: {},
      head: { type: "branch", ref: "main" },
      workingTree: {},
      index: {},
      conflicts: {},
      stash: [],
      tags: {},
      reflog: [],
      config: {},
      remotes: {},
      remoteTracking: {},
      cloneSources: {
        "https://gitgame.local/demo.git": {
          url: "https://gitgame.local/demo.git",
          branches: { main: "r1c1" },
          commits: {
            r1c1: {
              id: "r1c1",
              message: "initial",
              parents: [],
              files: { "README.md": "# Demo" },
              timestamp: 1,
            },
          },
        },
      },
    },
    goal: {
      initialized: true,
      fileContents: { "README.md": "# Demo" },
      workingTreeClean: true,
      indexEmpty: true,
      remoteTracking: { "origin/main": "r1c1" },
      remoteBranchHeads: { "origin/main": "r1c1" },
    },
    constraints: { baseScore: 30, stepPenalty: 2, maxSteps: 15, minSteps: 1 },
  },
  {
    courseId: "mvp",
    chapterId: "remote",
    title: "遥脉可查",
    sortOrder: 0,
    description: "本地已关联 origin。用 git remote -v 确认远程 URL，本关只观察不修改仓库。",
    difficulty: Difficulty.INTERMEDIATE,
    initialState: {
      ...makeRepoWithCommit("main", "r2local", "local", { "app.js": "local" }),
      remotes: {
        origin: {
          url: "https://gitgame.local/upstream.git",
          branches: { main: "r2remote" },
          commits: {
            r2remote: {
              id: "r2remote",
              message: "remote",
              parents: [],
              files: { "app.js": "remote" },
              timestamp: 1,
            },
          },
        },
      },
      remoteTracking: { "origin/main": "r2local" },
    },
    goal: {
      branchHeads: { main: "r2local" },
      workingTreeClean: true,
      indexEmpty: true,
    },
    constraints: { baseScore: 30, stepPenalty: 1, maxSteps: 10, minSteps: 1 },
  },
  {
    courseId: "mvp",
    chapterId: "remote",
    title: "只取不并",
    sortOrder: 0,
    description: "origin/main 领先本地 main。git fetch 更新远程跟踪分支，但不要合并到本地 main。",
    difficulty: Difficulty.INTERMEDIATE,
    initialState: {
      commits: {
        r3base: { id: "r3base", message: "base", parents: [], files: { "app.js": "v1" }, timestamp: 1 },
        r3new: { id: "r3new", message: "remote work", parents: ["r3base"], files: { "app.js": "v2" }, timestamp: 2 },
      },
      branches: { main: "r3base" },
      head: { type: "branch", ref: "main" },
      workingTree: { "app.js": { content: "v1", status: "unchanged" } },
      index: {},
      conflicts: {},
      stash: [],
      tags: {},
      reflog: [],
      remotes: {
        origin: {
          url: "https://gitgame.local/upstream.git",
          branches: { main: "r3new" },
          commits: {
            r3base: { id: "r3base", message: "base", parents: [], files: { "app.js": "v1" }, timestamp: 1 },
            r3new: { id: "r3new", message: "remote work", parents: ["r3base"], files: { "app.js": "v2" }, timestamp: 2 },
          },
        },
      },
      remoteTracking: { "origin/main": "r3base" },
    },
    goal: {
      branchHeads: { main: "r3base" },
      remoteTracking: { "origin/main": "r3new" },
      workingTreeContents: { "app.js": "v1" },
      workingTreeClean: true,
    },
    constraints: { baseScore: 30, stepPenalty: 2, maxSteps: 15, minSteps: 1 },
  },
  {
    courseId: "mvp",
    chapterId: "remote",
    title: "拉取合流",
    sortOrder: 0,
    description: "本地 main 落后 origin/main。git pull 把远端 v2 合入本地 main。",
    difficulty: Difficulty.INTERMEDIATE,
    initialState: {
      commits: {
        r4base: { id: "r4base", message: "base", parents: [], files: { "app.js": "v1" }, timestamp: 1 },
        r4new: { id: "r4new", message: "remote work", parents: ["r4base"], files: { "app.js": "v2" }, timestamp: 2 },
      },
      branches: { main: "r4base" },
      head: { type: "branch", ref: "main" },
      workingTree: { "app.js": { content: "v1", status: "unchanged" } },
      index: {},
      conflicts: {},
      stash: [],
      tags: {},
      reflog: [],
      remotes: {
        origin: {
          url: "https://gitgame.local/upstream.git",
          branches: { main: "r4new" },
          commits: {
            r4base: { id: "r4base", message: "base", parents: [], files: { "app.js": "v1" }, timestamp: 1 },
            r4new: { id: "r4new", message: "remote work", parents: ["r4base"], files: { "app.js": "v2" }, timestamp: 2 },
          },
        },
      },
      remoteTracking: { "origin/main": "r4base" },
    },
    goal: {
      branchHeads: { main: "r4new" },
      fileContents: { "app.js": "v2" },
      workingTreeClean: true,
      remoteTracking: { "origin/main": "r4new" },
    },
    constraints: { baseScore: 30, stepPenalty: 2, maxSteps: 20, minSteps: 1 },
  },
  {
    courseId: "mvp",
    chapterId: "remote",
    title: "拒推送先合",
    sortOrder: 0,
    description: "本地与 origin 已分叉。先 pull 合入远端 remote.txt，再 push 使 origin/main 与本地一致。",
    difficulty: Difficulty.INTERMEDIATE,
    initialState: {
      commits: {
        r5shared: { id: "r5shared", message: "shared", parents: [], files: { "app.js": "v1" }, timestamp: 1 },
        r5local: { id: "r5local", message: "local work", parents: ["r5shared"], files: { "app.js": "v1", "local.txt": "l" }, timestamp: 2 },
        r5remote: { id: "r5remote", message: "remote work", parents: ["r5shared"], files: { "app.js": "v1", "remote.txt": "r" }, timestamp: 3 },
      },
      branches: { main: "r5local" },
      head: { type: "branch", ref: "main" },
      workingTree: {
        "app.js": { content: "v1", status: "unchanged" },
        "local.txt": { content: "l", status: "unchanged" },
      },
      index: {},
      conflicts: {},
      stash: [],
      tags: {},
      reflog: [],
      remotes: {
        origin: {
          url: "https://gitgame.local/upstream.git",
          branches: { main: "r5remote" },
          commits: {
            r5shared: { id: "r5shared", message: "shared", parents: [], files: { "app.js": "v1" }, timestamp: 1 },
            r5local: { id: "r5local", message: "local work", parents: ["r5shared"], files: { "app.js": "v1", "local.txt": "l" }, timestamp: 2 },
            r5remote: { id: "r5remote", message: "remote work", parents: ["r5shared"], files: { "app.js": "v1", "remote.txt": "r" }, timestamp: 3 },
          },
        },
      },
      remoteTracking: { "origin/main": "r5remote" },
    },
    goal: {
      fileContents: { "app.js": "v1", "local.txt": "l", "remote.txt": "r" },
      workingTreeClean: true,
      mergeCommitRequired: true,
      remoteMainSynced: true,
    },
    constraints: { baseScore: 30, stepPenalty: 3, maxSteps: 30, minSteps: 2 },
  },
];

/** 路线条目：按 Pro Git 顺序重排 chapterId 与 sortOrder */
interface LevelRouteEntry {
  sortOrder: number;
  chapterId: string;
  /** 复用 LEGACY_LEVELS 时用标题匹配 */
  legacyTitle?: string;
  /** 新增关卡时用标题匹配 NEW_LEVEL_SEEDS */
  newTitle?: string;
}

/** 49 关修炼路线（9 章） */
const LEVEL_ROUTE: LevelRouteEntry[] = [
  { sortOrder: 1, chapterId: "setup", newTitle: "署名立传" },
  { sortOrder: 2, chapterId: "setup", newTitle: "空仓起手" },
  { sortOrder: 3, chapterId: "workspace", legacyTitle: "山门初开" },
  { sortOrder: 4, chapterId: "workspace", legacyTitle: "灵气扰动" },
  { sortOrder: 5, chapterId: "workspace", legacyTitle: "暂存之门" },
  { sortOrder: 6, chapterId: "workspace", legacyTitle: "三境分明" },
  { sortOrder: 7, chapterId: "workspace", legacyTitle: "明镜无尘" },
  { sortOrder: 8, chapterId: "snapshot", newTitle: "先看再选" },
  { sortOrder: 9, chapterId: "snapshot", legacyTitle: "第一枚灵印" },
  { sortOrder: 10, chapterId: "snapshot", legacyTitle: "只取所需" },
  { sortOrder: 11, chapterId: "snapshot", legacyTitle: "暂存与未暂存" },
  { sortOrder: 12, chapterId: "snapshot", legacyTitle: "错改回正" },
  { sortOrder: 13, chapterId: "snapshot", legacyTitle: "纯净快照" },
  { sortOrder: 14, chapterId: "history", newTitle: "史海钩沉" },
  { sortOrder: 15, chapterId: "branch", legacyTitle: "另开一脉" },
  { sortOrder: 16, chapterId: "branch", legacyTitle: "身在何处" },
  { sortOrder: 17, chapterId: "branch", legacyTitle: "分支独修" },
  { sortOrder: 18, chapterId: "branch", legacyTitle: "错路回头" },
  { sortOrder: 19, chapterId: "branch", legacyTitle: "双脉并行" },
  { sortOrder: 20, chapterId: "merge", legacyTitle: "顺水合流" },
  { sortOrder: 21, chapterId: "merge", legacyTitle: "双亲之印" },
  { sortOrder: 22, chapterId: "merge", legacyTitle: "同文相争" },
  { sortOrder: 23, chapterId: "merge", legacyTitle: "冲突调和" },
  { sortOrder: 24, chapterId: "merge", legacyTitle: "合而不乱" },
  { sortOrder: 25, chapterId: "remote", newTitle: "引泉入户" },
  { sortOrder: 26, chapterId: "remote", newTitle: "遥脉可查" },
  { sortOrder: 27, chapterId: "remote", newTitle: "只取不并" },
  { sortOrder: 28, chapterId: "remote", newTitle: "拉取合流" },
  { sortOrder: 29, chapterId: "remote", newTitle: "拒推送先合" },
  { sortOrder: 30, chapterId: "undo", legacyTitle: "撤回暂存" },
  { sortOrder: 31, chapterId: "undo", legacyTitle: "抹去误改" },
  { sortOrder: 32, chapterId: "undo", legacyTitle: "重做一印" },
  { sortOrder: 33, chapterId: "undo", legacyTitle: "公开补过" },
  { sortOrder: 34, chapterId: "undo", legacyTitle: "错误归位" },
  { sortOrder: 35, chapterId: "undo", legacyTitle: "临时收功" },
  { sortOrder: 36, chapterId: "undo", legacyTitle: "急救主线" },
  { sortOrder: 37, chapterId: "undo", legacyTitle: "藏而不失" },
  { sortOrder: 38, chapterId: "advanced", legacyTitle: "立碑记名" },
  { sortOrder: 39, chapterId: "advanced", legacyTitle: "版本归档" },
  { sortOrder: 40, chapterId: "advanced", legacyTitle: "摘一颗星" },
  { sortOrder: 41, chapterId: "advanced", legacyTitle: "错峰移植" },
  { sortOrder: 42, chapterId: "advanced", legacyTitle: "追上主脉" },
  { sortOrder: 43, chapterId: "advanced", legacyTitle: "整理三印" },
  { sortOrder: 44, chapterId: "advanced", legacyTitle: "移植解冲突" },
  { sortOrder: 45, chapterId: "advanced", legacyTitle: "追溯因果" },
  { sortOrder: 46, chapterId: "advanced", legacyTitle: "二分问道" },
  { sortOrder: 47, chapterId: "advanced", legacyTitle: "失足可返" },
  { sortOrder: 48, chapterId: "advanced", legacyTitle: "断线续命" },
  { sortOrder: 49, chapterId: "advanced", legacyTitle: "终局试炼" },
];

/**
 * 按路线表组装最终关卡列表。
 * 功能：保留现有关卡目标与初始状态，只更新 chapterId 与 sortOrder。
 * 参数：无。
 * 返回值：排序后的 LevelSeed 数组。
 */
const buildAllLevels = (): LevelSeed[] => {
  return LEVEL_ROUTE.map((entry) => {
    const title = entry.legacyTitle ?? entry.newTitle;
    if (!title) {
      throw new Error(`路线条目 sortOrder=${entry.sortOrder} 缺少标题`);
    }

    const source = entry.legacyTitle
      ? LEGACY_LEVELS.find((level) => level.title === entry.legacyTitle)
      : NEW_LEVEL_SEEDS.find((level) => level.title === entry.newTitle);

    if (!source) {
      throw new Error(`找不到关卡「${title}」的定义`);
    }

    return {
      ...source,
      chapterId: entry.chapterId,
      sortOrder: entry.sortOrder,
    };
  });
};

/** 完整 49 关定义（9 章 Pro Git 路线） */
export const ALL_LEVELS: LevelSeed[] = buildAllLevels();
