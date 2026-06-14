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

/** 完整 40 关定义 */
export const ALL_LEVELS: LevelSeed[] = [
  // ══ 第 1 章：初入仓境（5 关）sortOrder 1-5 ══
  {
    courseId: "mvp", chapterId: "workspace", title: "山门初开", sortOrder: 1,
    description: "运行 git status，观察未跟踪文件。保持 welcome.txt 不被误加入版本库。",
    difficulty: Difficulty.BEGINNER,
    initialState: { ...emptyRepoBase(), workingTree: { "welcome.txt": { content: "欢迎来到 GitGame", status: "untracked" } } },
    goal: { untrackedFiles: ["welcome.txt"], indexEmpty: true },
    constraints: { baseScore: 100, stepPenalty: 1, maxSteps: 10, minSteps: 1 },
  },
  {
    courseId: "mvp", chapterId: "workspace", title: "灵气扰动", sortOrder: 2,
    description: "用 git status 识别已跟踪文件的修改。保持 app.js 的本地改动不被覆盖。",
    difficulty: Difficulty.BEGINNER,
    initialState: { ...makeRepoWithCommit("main", "w1a2b3c", "init", { "app.js": "v1" }), workingTree: { "app.js": { content: "v2", status: "modified" } } },
    goal: { workingTreeContents: { "app.js": "v2" }, indexEmpty: true },
    constraints: { baseScore: 100, stepPenalty: 1, maxSteps: 10, minSteps: 1 },
  },
  {
    courseId: "mvp", chapterId: "workspace", title: "暂存之门", sortOrder: 3,
    description: "将 notes.md 的修改加入暂存区，不要提交。",
    difficulty: Difficulty.BEGINNER,
    initialState: { ...makeRepoWithCommit("main", "w2b3c4d", "init", { "notes.md": "旧笔记" }), workingTree: { "notes.md": { content: "新笔记内容", status: "modified" } } },
    goal: { indexContents: { "notes.md": "新笔记内容" }, workingTreeContents: { "notes.md": "新笔记内容" } },
    constraints: { baseScore: 100, stepPenalty: 2, maxSteps: 15 },
  },
  {
    courseId: "mvp", chapterId: "workspace", title: "三境分明", sortOrder: 4,
    description: "同时存在 staged、modified、untracked。只将 notes.md 暂存，不要动其他文件。",
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
    constraints: { baseScore: 100, stepPenalty: 2, maxSteps: 20 },
  },
  {
    courseId: "mvp", chapterId: "workspace", title: "明镜无尘", sortOrder: 5,
    description: "仓库中有多余变更，恢复所有已跟踪文件并删除多余未跟踪文件，使工作区 clean。",
    difficulty: Difficulty.BEGINNER,
    initialState: {
      ...makeRepoWithCommit("main", "w4d5e6f", "base", { "app.js": "clean" }),
      workingTree: { "app.js": { content: "dirty", status: "modified" } },
    },
    goal: { workingTreeClean: true, indexEmpty: true },
    constraints: { baseScore: 100, stepPenalty: 2, maxSteps: 20 },
  },

  // ══ 第 2 章：快照成印（5 关）sortOrder 6-10 ══
  {
    courseId: "mvp", chapterId: "snapshot", title: "第一枚灵印", sortOrder: 6,
    description: "将 README.md 加入暂存区并完成第一次 commit。",
    difficulty: Difficulty.BEGINNER,
    initialState: { ...makeRepoWithCommit("main", "s1a2b3c", "init", { "README.md": "# GitGame\n" }), workingTree: { "README.md": { content: "# GitGame\n\nLearn Git.", status: "modified" } } },
    goal: { workingTreeClean: true, indexEmpty: true, currentBranch: "main", fileContents: { "README.md": "# GitGame\n\nLearn Git." } },
    constraints: { baseScore: 100, stepPenalty: 2, maxSteps: 20 },
  },
  {
    courseId: "mvp", chapterId: "snapshot", title: "只取所需", sortOrder: 7,
    description: "app.js 和 debug.log 都有修改，但只提交 app.js。",
    difficulty: Difficulty.BEGINNER,
    initialState: {
      ...makeRepoWithCommit("main", "s2b3c4d", "base", { "app.js": "v1", "debug.log": "old log" }),
      workingTree: { "app.js": { content: "v2", status: "modified" }, "debug.log": { content: "new log", status: "modified" } },
    },
    goal: { fileContents: { "app.js": "v2", "debug.log": "old log" }, workingTreeContents: { "debug.log": "new log" }, indexEmpty: true },
    constraints: { baseScore: 100, stepPenalty: 2, maxSteps: 20 },
  },
  {
    courseId: "mvp", chapterId: "snapshot", title: "暂存与未暂存", sortOrder: 8,
    description: "app.js 已在暂存区，提交它并保留 todo.txt 的 WIP。",
    difficulty: Difficulty.BEGINNER,
    initialState: {
      ...makeRepoWithCommit("main", "s3c4d5e", "base", { "app.js": "v1", "todo.txt": "old" }),
      index: { "app.js": "v2" },
      workingTree: { "app.js": { content: "v2", status: "modified" }, "todo.txt": { content: "wip task", status: "modified" } },
    },
    goal: { fileContents: { "app.js": "v2", "todo.txt": "old" }, workingTreeContents: { "todo.txt": "wip task" }, indexEmpty: true },
    constraints: { baseScore: 100, stepPenalty: 2, maxSteps: 15 },
  },
  {
    courseId: "mvp", chapterId: "snapshot", title: "错改回正", sortOrder: 9,
    description: "config.json 被误改，用 restore 将工作区恢复为 HEAD 版本。",
    difficulty: Difficulty.BEGINNER,
    initialState: { ...makeRepoWithCommit("main", "s4d5e6f", "base", { "config.json": '{"mode":"prod"}' }), workingTree: { "config.json": { content: '{"mode":"broken"}', status: "modified" } } },
    goal: { workingTreeClean: true, indexEmpty: true, currentBranch: "main" },
    constraints: { baseScore: 100, stepPenalty: 2, maxSteps: 20 },
  },
  {
    courseId: "mvp", chapterId: "snapshot", title: "纯净快照", sortOrder: 10,
    description: "只将 app.js 提交进历史，junk.txt 不要进入版本库。",
    difficulty: Difficulty.BEGINNER,
    initialState: {
      ...makeRepoWithCommit("main", "s5e6f7a", "base", { "app.js": "v1" }),
      workingTree: { "app.js": { content: "v2", status: "modified" }, "junk.txt": { content: "垃圾", status: "untracked" } },
    },
    goal: { fileContents: { "app.js": "v2" }, indexEmpty: true, currentBranch: "main" },
    constraints: { baseScore: 100, stepPenalty: 2, maxSteps: 20 },
  },

  // ══ 第 3 章：分脉立道（5 关）sortOrder 11-15 ══
  {
    courseId: "mvp", chapterId: "branch", title: "另开一脉", sortOrder: 11,
    description: "创建 feature 分支并切换过去，main 保持不变。",
    difficulty: Difficulty.BEGINNER,
    initialState: makeRepoWithCommit("main", "b1a2b3c", "init project", { "app.js": "console.log('hi')" }),
    goal: { currentBranch: "feature", workingTreeClean: true, branchHeads: { main: "b1a2b3c", feature: "b1a2b3c" } },
    constraints: { baseScore: 100, stepPenalty: 2, maxSteps: 15 },
  },
  {
    courseId: "mvp", chapterId: "branch", title: "身在何处", sortOrder: 12,
    description: "当前在 feature 分支，切换到 main。",
    difficulty: Difficulty.BEGINNER,
    initialState: {
      ...makeRepoWithCommit("main", "b2c3d4e", "init", { "app.js": "v1" }),
      branches: { main: "b2c3d4e", feature: "b2c3d4e" },
      head: { type: "branch", ref: "feature" },
      workingTree: { "app.js": { content: "v1", status: "unchanged" } },
    },
    goal: { currentBranch: "main", workingTreeClean: true },
    constraints: { baseScore: 100, stepPenalty: 2, maxSteps: 10 },
  },
  {
    courseId: "mvp", chapterId: "branch", title: "分支独修", sortOrder: 13,
    description: "在 feature 提交 app.js 修改，main 保持不动。",
    difficulty: Difficulty.BEGINNER,
    initialState: {
      ...makeRepoWithCommit("main", "b3d4e5f", "init", { "app.js": "v1" }),
      branches: { main: "b3d4e5f", feature: "b3d4e5f" },
      head: { type: "branch", ref: "feature" },
      workingTree: { "app.js": { content: "v2", status: "modified" } },
    },
    goal: { currentBranch: "feature", workingTreeClean: true, indexEmpty: true, branchHeads: { main: "b3d4e5f" }, fileContents: { "app.js": "v2" } },
    constraints: { baseScore: 100, stepPenalty: 2, maxSteps: 20 },
  },
  {
    courseId: "mvp", chapterId: "branch", title: "错路回头", sortOrder: 14,
    description: "你在错误的 hotfix 分支，切到 feature 并完成提交。",
    difficulty: Difficulty.BEGINNER,
    initialState: {
      ...makeRepoWithCommit("main", "b4e5f6a", "init", { "app.js": "v1" }),
      branches: { main: "b4e5f6a", feature: "b4e5f6a", hotfix: "b4e5f6a" },
      head: { type: "branch", ref: "hotfix" },
      workingTree: { "app.js": { content: "feature-fix", status: "modified" } },
    },
    goal: { currentBranch: "feature", workingTreeClean: true, fileContents: { "app.js": "feature-fix" }, branchHeads: { main: "b4e5f6a" } },
    constraints: { baseScore: 100, stepPenalty: 2, maxSteps: 25 },
  },
  {
    courseId: "mvp", chapterId: "branch", title: "双脉并行", sortOrder: 15,
    description: "分别在 main 和 feature 各提交一次，两条分支各自前进。",
    difficulty: Difficulty.BEGINNER,
    initialState: {
      ...makeRepoWithCommit("main", "b5f6a7b", "init", { "app.js": "base", "main.txt": "m0" }),
      branches: { main: "b5f6a7b", feature: "b5f6a7b" },
      head: { type: "branch", ref: "main" },
      workingTree: { "app.js": { content: "base", status: "unchanged" }, "main.txt": { content: "m1", status: "modified" } },
    },
    goal: { currentBranch: "feature", workingTreeClean: true, fileContents: { "feature.txt": "f1" }, branchContains: [{ branch: "main", commit: "b5f6a7b" }] },
    constraints: { baseScore: 100, stepPenalty: 3, maxSteps: 30 },
  },

  // ══ 第 4 章：合流破障（5 关）sortOrder 16-20 ══
  {
    courseId: "mvp", chapterId: "merge", title: "顺水合流", sortOrder: 16,
    description: "feature 领先 main，快进合并到 main。",
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
    constraints: { baseScore: 100, stepPenalty: 3, maxSteps: 30 },
  },
  {
    courseId: "mvp", chapterId: "merge", title: "双亲之印", sortOrder: 17,
    description: "main 和 feature 各有独立提交，合并产生 merge commit。",
    difficulty: Difficulty.INTERMEDIATE,
    initialState: {
      commits: {
        base01: { id: "base01", message: "init", parents: [], files: { "readme.md": "hi" }, timestamp: 1 },
        main01: { id: "main01", message: "main change", parents: ["base01"], files: { "readme.md": "hi", "main.txt": "main only" }, timestamp: 2 },
        feat01: { id: "feat01", message: "feature change", parents: ["base01"], files: { "readme.md": "hi", "feature.txt": "feature only" }, timestamp: 3 },
      },
      branches: { main: "main01", feature: "feat01" }, head: { type: "branch", ref: "main" },
      workingTree: { "readme.md": { content: "hi", status: "unchanged" }, "main.txt": { content: "main only", status: "unchanged" } },
      index: {}, conflicts: {}, stash: [], tags: {}, reflog: [],
    },
    goal: { currentBranch: "main", workingTreeClean: true, indexEmpty: true, noConflicts: true, mergeCommitRequired: true, branchMerged: [{ source: "feature", target: "main" }], fileContents: { "main.txt": "main only", "feature.txt": "feature only" } },
    constraints: { baseScore: 100, stepPenalty: 3, maxSteps: 30 },
  },
  {
    courseId: "mvp", chapterId: "merge", title: "同文相争", sortOrder: 18,
    description: "两分支修改同一文件不同行，自动合并保留双方修改。",
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
    constraints: { baseScore: 100, stepPenalty: 3, maxSteps: 30 },
  },
  {
    courseId: "mvp", chapterId: "merge", title: "冲突调和", sortOrder: 19,
    description: "同一行冲突，用 checkout --theirs 选择 feature 版本后提交。",
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
    goal: { currentBranch: "main", workingTreeClean: true, indexEmpty: true, noConflicts: true, mergeCommitRequired: true, fileContents: { "config.json": '{"port":3000,"env":"feature"}' } },
    constraints: { baseScore: 100, stepPenalty: 3, maxSteps: 40 },
  },
  {
    courseId: "mvp", chapterId: "merge", title: "合而不乱", sortOrder: 20,
    description: "合并时仅 config.json 冲突，解决后保留 feature 版本。",
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
    goal: { currentBranch: "main", workingTreeClean: true, noConflicts: true, fileContents: { "config.json": "feat-v", "readme.md": "hello" } },
    constraints: { baseScore: 100, stepPenalty: 3, maxSteps: 40 },
  },

  // ══ 第 5 章：回溯补过（5 关）sortOrder 21-25 ══
  {
    courseId: "mvp", chapterId: "undo", title: "撤回暂存", sortOrder: 21,
    description: "secret.key 被误暂存，取消暂存但保留工作区修改。",
    difficulty: Difficulty.INTERMEDIATE,
    initialState: {
      ...makeRepoWithCommit("main", "u1a2b3c", "base", { "secret.key": "old-secret" }),
      index: { "secret.key": "new-secret" },
      workingTree: { "secret.key": { content: "new-secret", status: "modified" } },
    },
    goal: { indexEmpty: true, workingTreeContents: { "secret.key": "new-secret" }, currentBranch: "main" },
    constraints: { baseScore: 100, stepPenalty: 2, maxSteps: 15 },
  },
  {
    courseId: "mvp", chapterId: "undo", title: "抹去误改", sortOrder: 22,
    description: "app.js 被误改，用 restore 恢复到 HEAD。",
    difficulty: Difficulty.INTERMEDIATE,
    initialState: { ...makeRepoWithCommit("main", "u2b3c4d", "base", { "app.js": "correct" }), workingTree: { "app.js": { content: "wrong", status: "modified" } } },
    goal: { workingTreeClean: true, currentBranch: "main" },
    constraints: { baseScore: 100, stepPenalty: 2, maxSteps: 15 },
  },
  {
    courseId: "mvp", chapterId: "undo", title: "重做一印", sortOrder: 23,
    description: "最新 commit 内容不完整，soft reset 后重新提交完整内容。",
    difficulty: Difficulty.INTERMEDIATE,
    initialState: {
      commits: {
        g01: { id: "g01", message: "good base", parents: [], files: { "app.js": "v1" }, timestamp: 1 },
        bad1: { id: "bad1", message: "incomplete", parents: ["g01"], files: { "app.js": "v1" }, timestamp: 2 },
      },
      branches: { main: "bad1" }, head: { type: "branch", ref: "main" },
      workingTree: { "app.js": { content: "v1", status: "unchanged" } }, index: {}, conflicts: {}, stash: [], tags: {}, reflog: [],
    },
    goal: { fileContents: { "app.js": "v2" }, workingTreeClean: true, indexEmpty: true, commitsExist: ["g01"] },
    constraints: { baseScore: 100, stepPenalty: 3, maxSteps: 25 },
  },
  {
    courseId: "mvp", chapterId: "undo", title: "公开补过", sortOrder: 24,
    description: "已发布的错误 commit 需要 revert，保留历史记录。",
    difficulty: Difficulty.INTERMEDIATE,
    initialState: {
      commits: {
        g02: { id: "g02", message: "good", parents: [], files: { "config.json": '{"debug":false}' }, timestamp: 1 },
        b02: { id: "b02", message: "bad change", parents: ["g02"], files: { "config.json": '{"debug":true}' }, timestamp: 2 },
      },
      branches: { main: "b02" }, head: { type: "branch", ref: "main" },
      workingTree: { "config.json": { content: '{"debug":true}', status: "unchanged" } }, index: {}, conflicts: {}, stash: [], tags: {}, reflog: [],
    },
    goal: { fileContents: { "config.json": '{"debug":false}' }, workingTreeClean: true, commitsExist: ["g02", "b02"] },
    constraints: { baseScore: 100, stepPenalty: 3, maxSteps: 25 },
  },
  {
    courseId: "mvp", chapterId: "undo", title: "错误归位", sortOrder: 25,
    description: "错误提交在 topic 分支，将 main 重置回正确位置，保留 topic 上的错误提交。",
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
    constraints: { baseScore: 100, stepPenalty: 3, maxSteps: 25 },
  },

  // ══ 第 6 章：藏锋转身（5 关）sortOrder 26-30 ══
  {
    courseId: "mvp", chapterId: "stash", title: "临时收功", sortOrder: 26,
    description: "feature 有 WIP，贮藏后切换到 hotfix，工作区 clean。",
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
    constraints: { baseScore: 100, stepPenalty: 3, maxSteps: 20 },
  },
  {
    courseId: "mvp", chapterId: "stash", title: "急救主线", sortOrder: 27,
    description: "贮藏 WIP，切到 main 完成 hotfix 提交，再恢复 WIP。",
    difficulty: Difficulty.INTERMEDIATE,
    initialState: {
      commits: { st1base: { id: "st1base", message: "init", parents: [], files: { "app.js": "stable", "version.txt": "1.0" }, timestamp: 1 } },
      branches: { main: "st1base", feature: "st1base" }, head: { type: "branch", ref: "feature" },
      workingTree: { "app.js": { content: "wip", status: "modified" } }, index: {}, conflicts: {}, stash: [], tags: {}, reflog: [],
    },
    goal: { fileContents: { "version.txt": "1.0.1" }, workingTreeContents: { "app.js": "wip" }, currentBranch: "feature" },
    constraints: { baseScore: 100, stepPenalty: 3, maxSteps: 30 },
  },
  {
    courseId: "mvp", chapterId: "stash", title: "藏而不失", sortOrder: 28,
    description: "两次 stash 后，恢复较早的那条贮藏（app.js=first-wip）。",
    difficulty: Difficulty.INTERMEDIATE,
    initialState: {
      ...makeRepoWithCommit("main", "st2base", "init", { "app.js": "base" }),
      stash: [
        { id: "stash@{0}", message: "second", workingTree: { "app.js": { content: "second-wip", status: "modified" } }, index: {} },
        { id: "stash@{1}", message: "first", workingTree: { "app.js": { content: "first-wip", status: "modified" } }, index: {} },
      ],
    },
    goal: { workingTreeContents: { "app.js": "first-wip" }, indexEmpty: true },
    constraints: { baseScore: 100, stepPenalty: 3, maxSteps: 25 },
  },
  {
    courseId: "mvp", chapterId: "stash", title: "立碑记名", sortOrder: 29,
    description: "给当前发布版本提交打上 v1.0 标签。",
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
    constraints: { baseScore: 100, stepPenalty: 2, maxSteps: 15 },
  },
  {
    courseId: "mvp", chapterId: "stash", title: "版本归档", sortOrder: 30,
    description: "给包含 app.js=fixed 的提交打上 release 标签。",
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
    constraints: { baseScore: 100, stepPenalty: 2, maxSteps: 20 },
  },

  // ══ 第 7 章：摘星移火（5 关）sortOrder 31-35 ══
  {
    courseId: "mvp", chapterId: "cherry-pick", title: "摘一颗星", sortOrder: 31,
    description: "将 feature 上的好提交 fix01 cherry-pick 到 main。",
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
    goal: { currentBranch: "main", workingTreeClean: true, fileContents: { "app.js": "fixed" }, branchContains: [{ branch: "main", commit: "cp1base" }] },
    constraints: { baseScore: 100, stepPenalty: 3, maxSteps: 25 },
  },
  {
    courseId: "mvp", chapterId: "cherry-pick", title: "错峰移植", sortOrder: 32,
    description: "feature 有两个提交，只 cherry-pick 好的那个（fix02），不要坏的（bad02）。",
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
    goal: { fileContents: { "app.js": "fixed" }, commitsExist: ["cp2base", "bad02"], branchContains: [{ branch: "main", commit: "cp2base" }] },
    constraints: { baseScore: 100, stepPenalty: 3, maxSteps: 30 },
  },
  {
    courseId: "mvp", chapterId: "cherry-pick", title: "追上主脉", sortOrder: 33,
    description: "feature 落后 main，rebase 到最新 main。",
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
    goal: { currentBranch: "feature", fileContents: { "app.js": "feat-v" }, branchContains: [{ branch: "feature", commit: "rb1main" }] },
    constraints: { baseScore: 100, stepPenalty: 3, maxSteps: 30 },
  },
  {
    courseId: "mvp", chapterId: "cherry-pick", title: "整理三印", sortOrder: 34,
    description: "将最近 3 个零散提交合并为 1 个语义清晰的提交（可用 reset --soft HEAD~3）。",
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
    goal: { fileContents: { "app.js": "v3" }, commitsExist: ["sq1"], branchContains: [{ branch: "main", commit: "sq1" }] },
    constraints: { baseScore: 100, stepPenalty: 3, maxSteps: 25 },
  },
  {
    courseId: "mvp", chapterId: "cherry-pick", title: "移植解冲突", sortOrder: 35,
    description: "rebase main 时产生冲突，解决后完成 rebase。",
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
    goal: { currentBranch: "feature", fileContents: { "app.js": "feat-version" }, branchContains: [{ branch: "feature", commit: "rb2main" }], noConflicts: true, workingTreeClean: true },
    constraints: { baseScore: 100, stepPenalty: 3, maxSteps: 40 },
  },

  // ══ 第 8 章：断案寻因（5 关）sortOrder 36-40 ══
  {
    courseId: "mvp", chapterId: "debug", title: "追溯因果", sortOrder: 36,
    description: "用 log/show 找到引入 bug 的提交 bad36，然后 revert 它。",
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
    goal: { fileContents: { "app.js": "ok" }, workingTreeClean: true, commitsExist: ["d36g", "d36b", "d36h"] },
    constraints: { baseScore: 100, stepPenalty: 3, maxSteps: 30 },
  },
  {
    courseId: "mvp", chapterId: "debug", title: "二分问道", sortOrder: 37,
    description: "用 bisect 在 d37g 和 d37h 之间定位首个不良提交 d37b。",
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
    constraints: { baseScore: 100, stepPenalty: 3, maxSteps: 40 },
  },
  {
    courseId: "mvp", chapterId: "debug", title: "失足可返", sortOrder: 38,
    description: "main 被误 reset 到旧版本，用 reflog 找回 d38good。",
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
    constraints: { baseScore: 100, stepPenalty: 3, maxSteps: 20 },
  },
  {
    courseId: "mvp", chapterId: "debug", title: "断线续命", sortOrder: 39,
    description: "feature 分支被误删，用 reflog 中的提交恢复 feature 指针。",
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
    constraints: { baseScore: 100, stepPenalty: 3, maxSteps: 20 },
  },
  {
    courseId: "mvp", chapterId: "debug", title: "终局试炼", sortOrder: 40,
    description: "综合恢复：revert 错误提交、合并 hotfix、打上 v2.0 标签。",
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
      workingTreeClean: true,
      noConflicts: true,
      commitsExist: ["d40base", "d40bad"],
    },
    constraints: { baseScore: 100, stepPenalty: 3, maxSteps: 50 },
  },
];
