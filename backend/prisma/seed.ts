import { PrismaClient, Difficulty } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import type { LevelGoal, RepoState } from "../src/git-engine/repo-state.types";
import { toPrismaJson } from "../src/common/json.util";

const prisma = new PrismaClient();

/** 创建带单个初始提交的仓库状态 */
const makeRepoWithCommit = (
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
});

/** 关卡种子定义结构 */
interface LevelSeed {
  courseId: string;
  chapterId: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  sortOrder: number;
  initialState: RepoState;
  goal: LevelGoal;
  constraints: { baseScore: number; stepPenalty: number; maxSteps: number };
}

/** MVP 18 关完整定义 */
const MVP_LEVELS: LevelSeed[] = [
  // ── 第 1 章：初入仓境（3 关）──
  {
    courseId: "mvp",
    chapterId: "workspace",
    title: "山门初开",
    description: "运行 git status，观察未跟踪文件。保持 welcome.txt 不被误加入版本库。",
    difficulty: Difficulty.BEGINNER,
    sortOrder: 1,
    initialState: {
      commits: {},
      branches: { main: "" },
      head: { type: "branch", ref: "main" },
      workingTree: {
        "welcome.txt": { content: "欢迎来到 GitGame", status: "untracked" },
      },
      index: {},
      conflicts: {},
      stash: [],
    },
    goal: {
      untrackedFiles: ["welcome.txt"],
      indexEmpty: true,
    },
    constraints: { baseScore: 100, stepPenalty: 1, maxSteps: 10 },
  },
  {
    courseId: "mvp",
    chapterId: "workspace",
    title: "灵气扰动",
    description: "用 git status 识别已跟踪文件的修改。保持 app.js 的本地改动不被覆盖。",
    difficulty: Difficulty.BEGINNER,
    sortOrder: 2,
    initialState: {
      ...makeRepoWithCommit("main", "w1a2b3c", "init", { "app.js": "v1" }),
      workingTree: {
        "app.js": { content: "v2", status: "modified" },
      },
    },
    goal: {
      workingTreeContents: { "app.js": "v2" },
      indexEmpty: true,
    },
    constraints: { baseScore: 100, stepPenalty: 1, maxSteps: 10 },
  },
  {
    courseId: "mvp",
    chapterId: "workspace",
    title: "暂存之门",
    description: "将 notes.md 的修改加入暂存区（staging area），不要提交。",
    difficulty: Difficulty.BEGINNER,
    sortOrder: 3,
    initialState: {
      ...makeRepoWithCommit("main", "w2b3c4d", "init", { "notes.md": "旧笔记" }),
      workingTree: {
        "notes.md": { content: "新笔记内容", status: "modified" },
      },
    },
    goal: {
      indexContents: { "notes.md": "新笔记内容" },
      workingTreeContents: { "notes.md": "新笔记内容" },
    },
    constraints: { baseScore: 100, stepPenalty: 2, maxSteps: 15 },
  },

  // ── 第 2 章：快照成印（4 关）──
  {
    courseId: "mvp",
    chapterId: "snapshot",
    title: "第一枚灵印",
    description: "将 README.md 加入暂存区并完成第一次 commit。",
    difficulty: Difficulty.BEGINNER,
    sortOrder: 4,
    initialState: {
      ...makeRepoWithCommit("main", "s1a2b3c", "init", { "README.md": "# GitGame\n" }),
      workingTree: {
        "README.md": { content: "# GitGame\n\nLearn Git.", status: "modified" },
      },
    },
    goal: {
      workingTreeClean: true,
      indexEmpty: true,
      currentBranch: "main",
      fileContents: { "README.md": "# GitGame\n\nLearn Git." },
    },
    constraints: { baseScore: 100, stepPenalty: 2, maxSteps: 20 },
  },
  {
    courseId: "mvp",
    chapterId: "snapshot",
    title: "只取所需",
    description: "app.js 和 debug.log 都有修改，但只提交 app.js，不要提交 debug.log。",
    difficulty: Difficulty.BEGINNER,
    sortOrder: 5,
    initialState: {
      ...makeRepoWithCommit("main", "s2b3c4d", "base", { "app.js": "v1", "debug.log": "old log" }),
      workingTree: {
        "app.js": { content: "v2", status: "modified" },
        "debug.log": { content: "new log", status: "modified" },
      },
    },
    goal: {
      fileContents: { "app.js": "v2" },
      workingTreeContents: { "debug.log": "new log" },
      indexEmpty: true,
      currentBranch: "main",
    },
    constraints: { baseScore: 100, stepPenalty: 2, maxSteps: 20 },
  },
  {
    courseId: "mvp",
    chapterId: "snapshot",
    title: "暂存与未暂存",
    description: "app.js 已在暂存区，todo.txt 仍在工作区。提交 app.js，保留 todo.txt 的未完成修改。",
    difficulty: Difficulty.BEGINNER,
    sortOrder: 6,
    initialState: {
      ...makeRepoWithCommit("main", "s3c4d5e", "base", { "app.js": "v1", "todo.txt": "old" }),
      index: { "app.js": "v2" },
      workingTree: {
        "app.js": { content: "v2", status: "modified" },
        "todo.txt": { content: "wip task", status: "modified" },
      },
    },
    goal: {
      fileContents: { "app.js": "v2" },
      workingTreeContents: { "todo.txt": "wip task" },
      indexEmpty: true,
      currentBranch: "main",
    },
    constraints: { baseScore: 100, stepPenalty: 2, maxSteps: 15 },
  },
  {
    courseId: "mvp",
    chapterId: "snapshot",
    title: "错改回正",
    description: "config.json 被误改，先用 restore 恢复正确内容，再提交。",
    difficulty: Difficulty.BEGINNER,
    sortOrder: 7,
    initialState: {
      ...makeRepoWithCommit("main", "s4d5e6f", "base", { "config.json": '{"mode":"prod"}' }),
      workingTree: {
        "config.json": { content: '{"mode":"broken"}', status: "modified" },
      },
    },
    goal: {
      workingTreeClean: true,
      indexEmpty: true,
      fileContents: { "config.json": '{"mode":"prod"}' },
      currentBranch: "main",
    },
    constraints: { baseScore: 100, stepPenalty: 2, maxSteps: 20 },
  },

  // ── 第 3 章：分脉立道（3 关）──
  {
    courseId: "mvp",
    chapterId: "branch",
    title: "另开一脉",
    description: "在 main 上创建 feature 分支并切换过去，main 保持不变。",
    difficulty: Difficulty.BEGINNER,
    sortOrder: 8,
    initialState: makeRepoWithCommit("main", "b1a2b3c", "init project", {
      "app.js": "console.log('hi')",
    }),
    goal: {
      currentBranch: "feature",
      workingTreeClean: true,
      branchHeads: { main: "b1a2b3c", feature: "b1a2b3c" },
    },
    constraints: { baseScore: 100, stepPenalty: 2, maxSteps: 15 },
  },
  {
    courseId: "mvp",
    chapterId: "branch",
    title: "身在何处",
    description: "你当前在 feature 分支，切换到 main 分支。",
    difficulty: Difficulty.BEGINNER,
    sortOrder: 9,
    initialState: {
      ...makeRepoWithCommit("main", "b2c3d4e", "init", { "app.js": "v1" }),
      branches: { main: "b2c3d4e", feature: "b2c3d4e" },
      head: { type: "branch", ref: "feature" },
      workingTree: { "app.js": { content: "v1", status: "unchanged" } },
    },
    goal: {
      currentBranch: "main",
      workingTreeClean: true,
    },
    constraints: { baseScore: 100, stepPenalty: 2, maxSteps: 10 },
  },
  {
    courseId: "mvp",
    chapterId: "branch",
    title: "分支独修",
    description: "在 feature 分支提交 app.js 的修改，main 分支保持不动。",
    difficulty: Difficulty.BEGINNER,
    sortOrder: 10,
    initialState: {
      ...makeRepoWithCommit("main", "b3d4e5f", "init", { "app.js": "v1" }),
      branches: { main: "b3d4e5f", feature: "b3d4e5f" },
      head: { type: "branch", ref: "feature" },
      workingTree: { "app.js": { content: "v2", status: "modified" } },
    },
    goal: {
      currentBranch: "feature",
      workingTreeClean: true,
      indexEmpty: true,
      branchHeads: { main: "b3d4e5f" },
      fileContents: { "app.js": "v2" },
    },
    constraints: { baseScore: 100, stepPenalty: 2, maxSteps: 20 },
  },

  // ── 第 4 章：合流破障（4 关）──
  {
    courseId: "mvp",
    chapterId: "merge",
    title: "顺水合流",
    description: "feature 领先 main，将 feature 合并到 main（快进合并）。",
    difficulty: Difficulty.INTERMEDIATE,
    sortOrder: 11,
    initialState: {
      commits: {
        m1: { id: "m1", message: "main init", parents: [], files: { "app.js": "main" }, timestamp: 1 },
        f1: { id: "f1", message: "feature work", parents: ["m1"], files: { "app.js": "feature" }, timestamp: 2 },
      },
      branches: { main: "m1", feature: "f1" },
      head: { type: "branch", ref: "main" },
      workingTree: { "app.js": { content: "main", status: "unchanged" } },
      index: {},
      conflicts: {},
      stash: [],
    },
    goal: {
      currentBranch: "main",
      workingTreeClean: true,
      indexEmpty: true,
      noConflicts: true,
      branchMerged: [{ source: "feature", target: "main" }],
      fileContents: { "app.js": "feature" },
    },
    constraints: { baseScore: 100, stepPenalty: 3, maxSteps: 30 },
  },
  {
    courseId: "mvp",
    chapterId: "merge",
    title: "双亲之印",
    description: "main 和 feature 各有独立提交，合并后产生 merge commit。",
    difficulty: Difficulty.INTERMEDIATE,
    sortOrder: 12,
    initialState: {
      commits: {
        base01: { id: "base01", message: "init", parents: [], files: { "readme.md": "hi" }, timestamp: 1 },
        main01: {
          id: "main01",
          message: "main change",
          parents: ["base01"],
          files: { "readme.md": "hi", "main.txt": "main only" },
          timestamp: 2,
        },
        feat01: {
          id: "feat01",
          message: "feature change",
          parents: ["base01"],
          files: { "readme.md": "hi", "feature.txt": "feature only" },
          timestamp: 3,
        },
      },
      branches: { main: "main01", feature: "feat01" },
      head: { type: "branch", ref: "main" },
      workingTree: { "readme.md": { content: "hi", status: "unchanged" }, "main.txt": { content: "main only", status: "unchanged" } },
      index: {},
      conflicts: {},
      stash: [],
    },
    goal: {
      currentBranch: "main",
      workingTreeClean: true,
      indexEmpty: true,
      noConflicts: true,
      mergeCommitRequired: true,
      branchMerged: [{ source: "feature", target: "main" }],
      fileContents: { "main.txt": "main only", "feature.txt": "feature only" },
    },
    constraints: { baseScore: 100, stepPenalty: 3, maxSteps: 30 },
  },
  {
    courseId: "mvp",
    chapterId: "merge",
    title: "同文相争",
    description: "两分支修改同一文件的不同位置，自动合并后保留双方修改。",
    difficulty: Difficulty.INTERMEDIATE,
    sortOrder: 13,
    initialState: {
      commits: {
        base02: {
          id: "base02",
          message: "init",
          parents: [],
          files: { "doc.md": "line1\nline2\nline3" },
          timestamp: 1,
        },
        main02: {
          id: "main02",
          message: "edit line1",
          parents: ["base02"],
          files: { "doc.md": "LINE1\nline2\nline3" },
          timestamp: 2,
        },
        feat02: {
          id: "feat02",
          message: "edit line3",
          parents: ["base02"],
          files: { "doc.md": "line1\nline2\nLINE3" },
          timestamp: 3,
        },
      },
      branches: { main: "main02", feature: "feat02" },
      head: { type: "branch", ref: "main" },
      workingTree: { "doc.md": { content: "LINE1\nline2\nline3", status: "unchanged" } },
      index: {},
      conflicts: {},
      stash: [],
    },
    goal: {
      currentBranch: "main",
      workingTreeClean: true,
      indexEmpty: true,
      noConflicts: true,
      branchMerged: [{ source: "feature", target: "main" }],
      fileContents: { "doc.md": "LINE1\nline2\nLINE3" },
    },
    constraints: { baseScore: 100, stepPenalty: 3, maxSteps: 30 },
  },
  {
    courseId: "mvp",
    chapterId: "merge",
    title: "冲突调和",
    description: "两分支修改同一行产生冲突。用 checkout --theirs 选择 feature 版本，解决后提交。",
    difficulty: Difficulty.INTERMEDIATE,
    sortOrder: 14,
    initialState: {
      commits: {
        base03: { id: "base03", message: "init", parents: [], files: { "config.json": '{"port":3000}' }, timestamp: 1 },
        main03: {
          id: "main03",
          message: "main port",
          parents: ["base03"],
          files: { "config.json": '{"port":3000,"env":"main"}' },
          timestamp: 2,
        },
        feat03: {
          id: "feat03",
          message: "feature port",
          parents: ["base03"],
          files: { "config.json": '{"port":3000,"env":"feature"}' },
          timestamp: 3,
        },
      },
      branches: { main: "main03", feature: "feat03" },
      head: { type: "branch", ref: "main" },
      workingTree: { "config.json": { content: '{"port":3000,"env":"main"}', status: "unchanged" } },
      index: {},
      conflicts: {},
      stash: [],
    },
    goal: {
      currentBranch: "main",
      workingTreeClean: true,
      indexEmpty: true,
      noConflicts: true,
      mergeCommitRequired: true,
      fileContents: { "config.json": '{"port":3000,"env":"feature"}' },
    },
    constraints: { baseScore: 100, stepPenalty: 3, maxSteps: 40 },
  },

  // ── 第 5 章：回溯补过（2 关）──
  {
    courseId: "mvp",
    chapterId: "undo",
    title: "撤回暂存",
    description: "secret.key 被误加入暂存区，取消暂存但保留工作区修改。",
    difficulty: Difficulty.INTERMEDIATE,
    sortOrder: 15,
    initialState: {
      ...makeRepoWithCommit("main", "u1a2b3c", "base", { "secret.key": "old-secret" }),
      index: { "secret.key": "new-secret" },
      workingTree: {
        "secret.key": { content: "new-secret", status: "modified" },
      },
    },
    goal: {
      indexEmpty: true,
      workingTreeContents: { "secret.key": "new-secret" },
      currentBranch: "main",
    },
    constraints: { baseScore: 100, stepPenalty: 2, maxSteps: 15 },
  },
  {
    courseId: "mvp",
    chapterId: "undo",
    title: "抹去误改",
    description: "app.js 被误改，用 restore 恢复到 HEAD 版本。",
    difficulty: Difficulty.INTERMEDIATE,
    sortOrder: 16,
    initialState: {
      ...makeRepoWithCommit("main", "u2b3c4d", "base", { "app.js": "correct" }),
      workingTree: {
        "app.js": { content: "wrong", status: "modified" },
      },
    },
    goal: {
      workingTreeClean: true,
      workingTreeContents: { "app.js": "correct" },
      currentBranch: "main",
    },
    constraints: { baseScore: 100, stepPenalty: 2, maxSteps: 15 },
  },

  // ── 第 6 章：藏锋转身（1 关）──
  {
    courseId: "mvp",
    chapterId: "stash",
    title: "临时收功",
    description: "feature 上有未完成修改，贮藏后切换到 hotfix 分支，工作区保持 clean。",
    difficulty: Difficulty.INTERMEDIATE,
    sortOrder: 17,
    initialState: {
      commits: {
        st0base: { id: "st0base", message: "init", parents: [], files: { "app.js": "stable" }, timestamp: 1 },
        st0feat: {
          id: "st0feat",
          message: "feature wip",
          parents: ["st0base"],
          files: { "app.js": "stable" },
          timestamp: 2,
        },
      },
      branches: { main: "st0base", feature: "st0feat", hotfix: "st0base" },
      head: { type: "branch", ref: "feature" },
      workingTree: { "app.js": { content: "wip-change", status: "modified" } },
      index: {},
      conflicts: {},
      stash: [],
    },
    goal: {
      currentBranch: "hotfix",
      workingTreeClean: true,
      stashContents: { "app.js": "wip-change" },
    },
    constraints: { baseScore: 100, stepPenalty: 3, maxSteps: 20 },
  },

  // ── 第 7 章：摘星移火（1 关）──
  {
    courseId: "mvp",
    chapterId: "cherry-pick",
    title: "摘一颗星",
    description: "feature 分支有一个好提交 fix01，将它 cherry-pick 到 main。",
    difficulty: Difficulty.ADVANCED,
    sortOrder: 18,
    initialState: {
      commits: {
        cp1base: { id: "cp1base", message: "init", parents: [], files: { "app.js": "main" }, timestamp: 1 },
        cp1feat: {
          id: "cp1feat",
          message: "feature base",
          parents: ["cp1base"],
          files: { "app.js": "main" },
          timestamp: 2,
        },
        fix01: {
          id: "fix01",
          message: "fix bug",
          parents: ["cp1feat"],
          files: { "app.js": "fixed" },
          timestamp: 3,
        },
      },
      branches: { main: "cp1base", feature: "fix01" },
      head: { type: "branch", ref: "main" },
      workingTree: { "app.js": { content: "main", status: "unchanged" } },
      index: {},
      conflicts: {},
      stash: [],
    },
    goal: {
      currentBranch: "main",
      workingTreeClean: true,
      indexEmpty: true,
      fileContents: { "app.js": "fixed" },
      branchContains: [{ branch: "main", commit: "cp1base" }],
    },
    constraints: { baseScore: 100, stepPenalty: 3, maxSteps: 25 },
  },
];

/**
 * 数据库种子脚本。
 * 功能：创建管理员、演示用户和 MVP 18 个教学关卡。
 * 参数：无（读取 DATABASE_URL 环境变量）。
 * 返回值：Promise<void>。
 */
async function main() {
  const adminHash = await bcrypt.hash("admin123", 10);
  const userHash = await bcrypt.hash("demo123", 10);

  await prisma.user.upsert({
    where: { email: "admin@gitgame.local" },
    update: {},
    create: {
      email: "admin@gitgame.local",
      passwordHash: adminHash,
      displayName: "管理员",
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "demo@gitgame.local" },
    update: {},
    create: {
      email: "demo@gitgame.local",
      passwordHash: userHash,
      displayName: "演示用户",
    },
  });

  // 下架旧版关卡，避免与 MVP 路径混淆
  await prisma.level.updateMany({
    where: { courseId: { in: ["basics", "workflow"] } },
    data: { status: "DRAFT" },
  });

  for (const level of MVP_LEVELS) {
    const existing = await prisma.level.findFirst({
      where: {
        courseId: level.courseId,
        chapterId: level.chapterId,
        sortOrder: level.sortOrder,
      },
    });
    const levelData = {
      courseId: level.courseId,
      chapterId: level.chapterId,
      title: level.title,
      description: level.description,
      difficulty: level.difficulty,
      sortOrder: level.sortOrder,
      initialState: toPrismaJson(level.initialState),
      goal: toPrismaJson(level.goal),
      constraints: toPrismaJson(level.constraints),
      status: "PUBLISHED" as const,
      publishedAt: new Date(),
    };
    if (existing) {
      await prisma.level.update({
        where: { id: existing.id },
        data: levelData,
      });
    } else {
      await prisma.level.create({
        data: levelData,
      });
    }
  }

  const demoUser = await prisma.user.findUnique({ where: { email: "demo@gitgame.local" } });
  const firstLevel = await prisma.level.findFirst({
    where: { courseId: "mvp", sortOrder: 1 },
  });
  const firstLevelSeed = MVP_LEVELS.find((level) => level.sortOrder === 1);

  if (demoUser && firstLevel && firstLevelSeed) {
    const existingResult = await prisma.levelResult.findUnique({
      where: { userId_levelId: { userId: demoUser.id, levelId: firstLevel.id } },
    });

    if (!existingResult) {
      const demoAttempt = await prisma.attempt.create({
        data: {
          userId: demoUser.id,
          levelId: firstLevel.id,
          status: "COMPLETED",
          currentState: toPrismaJson(firstLevelSeed.initialState),
          stepCount: 1,
          completedAt: new Date(),
        },
      });

      await prisma.levelResult.create({
        data: {
          userId: demoUser.id,
          levelId: firstLevel.id,
          attemptId: demoAttempt.id,
          score: 99,
          durationSeconds: 30,
          commandCount: 1,
        },
      });

      await prisma.leaderboardEntry.create({
        data: {
          userId: demoUser.id,
          levelId: firstLevel.id,
          score: 99,
          durationSeconds: 30,
          displayName: demoUser.displayName,
        },
      });
    }
  }

  // 将已有通关记录同步到排行榜表，修复历史数据不一致
  const completedResults = await prisma.levelResult.findMany({
    include: { user: { select: { displayName: true } } },
  });
  for (const result of completedResults) {
    await prisma.leaderboardEntry.upsert({
      where: { userId_levelId: { userId: result.userId, levelId: result.levelId } },
      create: {
        userId: result.userId,
        levelId: result.levelId,
        score: result.score,
        durationSeconds: result.durationSeconds,
        displayName: result.user.displayName,
      },
      update: {
        score: result.score,
        durationSeconds: result.durationSeconds,
        displayName: result.user.displayName,
      },
    });
  }

  console.log("种子数据写入完成：2 用户 + 18 MVP 关卡 + 演示排行榜");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
