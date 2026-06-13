import { PrismaClient, Difficulty } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import type { RepoState } from "../src/git-engine/repo-state.types";
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
});

/**
 * 数据库种子脚本。
 * 功能：创建管理员、演示用户和 5 个教学关卡。
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

  const levels = [
    {
      courseId: "basics",
      chapterId: "commit",
      title: "首次提交",
      description: "将工作区中的 README.md 加入暂存区并完成第一次 commit。",
      difficulty: Difficulty.BEGINNER,
      sortOrder: 1,
      initialState: {
        ...makeRepoWithCommit("main", "a1b2c3d", "init", { "README.md": "# GitGame\n" }),
        workingTree: {
          "README.md": { content: "# GitGame\n\nLearn Git.", status: "modified" },
        },
      } satisfies RepoState,
      goal: {
        workingTreeClean: true,
        indexEmpty: true,
        currentBranch: "main",
        fileContents: { "README.md": "# GitGame\n\nLearn Git." },
      },
      constraints: { baseScore: 100, stepPenalty: 2, maxSteps: 20 },
    },
    {
      courseId: "basics",
      chapterId: "branch",
      title: "创建并切换分支",
      description: "创建 feature 分支并切换过去，main 保持不变。",
      difficulty: Difficulty.BEGINNER,
      sortOrder: 2,
      initialState: makeRepoWithCommit("main", "b2c3d4e", "init project", {
        "app.js": "console.log('hi')",
      }),
      goal: {
        currentBranch: "feature",
        workingTreeClean: true,
        branchContains: [{ branch: "main", commit: "b2c3d4e" }],
      },
      constraints: { baseScore: 100, stepPenalty: 2, maxSteps: 15 },
    },
    {
      courseId: "basics",
      chapterId: "staging",
      title: "暂存修改",
      description: "修改 app.js 后正确 add 并 commit，保持工作区 clean。",
      difficulty: Difficulty.BEGINNER,
      sortOrder: 3,
      initialState: {
        ...makeRepoWithCommit("main", "c3d4e5f", "base", { "app.js": "v1" }),
        workingTree: {
          "app.js": { content: "v2", status: "modified" },
        },
      } satisfies RepoState,
      goal: {
        workingTreeClean: true,
        indexEmpty: true,
        currentBranch: "main",
        fileContents: { "app.js": "v2" },
      },
      constraints: { baseScore: 100, stepPenalty: 2, maxSteps: 10 },
    },
    {
      courseId: "workflow",
      chapterId: "merge",
      title: "合并 feature 到 main",
      description: "将 feature 分支的变更合并到 main。可用 merge，也可用其他方式达成相同最终状态。",
      difficulty: Difficulty.INTERMEDIATE,
      sortOrder: 4,
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
      } satisfies RepoState,
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
      courseId: "workflow",
      chapterId: "undo",
      title: "撤销错误提交",
      description: "main 上有一个错误提交，恢复 config.json 到正确内容。可用 revert 或 reset。",
      difficulty: Difficulty.INTERMEDIATE,
      sortOrder: 5,
      initialState: {
        commits: {
          g1: { id: "g1", message: "good", parents: [], files: { "config.json": '{"debug":false}' }, timestamp: 1 },
          b1: { id: "b1", message: "bad change", parents: ["g1"], files: { "config.json": '{"debug":true}' }, timestamp: 2 },
        },
        branches: { main: "b1" },
        head: { type: "branch", ref: "main" },
        workingTree: { "config.json": { content: '{"debug":true}', status: "unchanged" } },
        index: {},
        conflicts: {},
      } satisfies RepoState,
      goal: {
        currentBranch: "main",
        workingTreeClean: true,
        indexEmpty: true,
        fileContents: { "config.json": '{"debug":false}' },
        commitsExist: ["g1"],
      },
      constraints: { baseScore: 100, stepPenalty: 3, maxSteps: 25 },
    },
  ];

  for (const level of levels) {
    const existing = await prisma.level.findFirst({
      where: { courseId: level.courseId, title: level.title },
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
  const firstLevel = await prisma.level.findFirst({ where: { sortOrder: 1 } });
  const firstLevelSeed = levels.find((level) => level.sortOrder === 1);

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
          stepCount: 2,
          completedAt: new Date(),
        },
      });

      await prisma.levelResult.create({
        data: {
          userId: demoUser.id,
          levelId: firstLevel.id,
          attemptId: demoAttempt.id,
          score: 96,
          durationSeconds: 38,
          commandCount: 2,
        },
      });

      await prisma.leaderboardEntry.create({
        data: {
          userId: demoUser.id,
          levelId: firstLevel.id,
          score: 96,
          durationSeconds: 38,
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

  console.log("种子数据写入完成：2 用户 + 5 关卡 + 演示排行榜");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
