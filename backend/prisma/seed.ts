import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { toPrismaJson } from "../src/common/json.util";
import { convertLegacyPracticeScore, DEFAULT_LEVEL_BASE_SCORE } from "../src/judge/scoring.constants";
import { ALL_LEVELS } from "./level-definitions";

const prisma = new PrismaClient();

/**
 * 数据库种子脚本。
 * 功能：创建管理员、演示用户和完整 49 个教学关卡。
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

  const heroInvites = [
    { code: "YINGXIONG-DEMO", note: "演示注册用英雄帖" },
    { code: "YINGXIONG-2026", note: "通用英雄帖" },
  ];

  for (const invite of heroInvites) {
    await prisma.heroInvite.upsert({
      where: { code: invite.code },
      update: {},
      create: invite,
    });
  }

  // 下架旧版关卡
  await prisma.level.updateMany({
    where: { courseId: { in: ["basics", "workflow"] } },
    data: { status: "DRAFT" },
  });

  for (const level of ALL_LEVELS) {
    /** 按标题 upsert，保留用户历史 levelId */
    const existing = await prisma.level.findFirst({
      where: {
        courseId: level.courseId,
        title: level.title,
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
      await prisma.level.update({ where: { id: existing.id }, data: levelData });
    } else {
      await prisma.level.create({ data: levelData });
    }
  }

  // 下架不在当前路线中的旧 mvp 关卡
  const validTitles = new Set(ALL_LEVELS.map((l) => l.title));
  const publishedMvp = await prisma.level.findMany({ where: { courseId: "mvp", status: "PUBLISHED" } });
  for (const old of publishedMvp) {
    if (!validTitles.has(old.title)) {
      await prisma.level.update({ where: { id: old.id }, data: { status: "DRAFT" } });
    }
  }

  const demoUser = await prisma.user.findUnique({ where: { email: "demo@gitgame.local" } });
  const firstLevel = await prisma.level.findFirst({ where: { courseId: "mvp", sortOrder: 1 } });
  const firstLevelSeed = ALL_LEVELS.find((level) => level.sortOrder === 1);

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
          completedAt: new Date(Date.now() - 5 * 60 * 1000),
        },
      });

      await prisma.levelResult.create({
        data: {
          userId: demoUser.id,
          levelId: firstLevel.id,
          attemptId: demoAttempt.id,
          score: 29,
          durationSeconds: 30,
          commandCount: 1,
          completedAt: new Date(Date.now() - 5 * 60 * 1000),
        },
      });

      await prisma.leaderboardEntry.create({
        data: {
          userId: demoUser.id,
          levelId: firstLevel.id,
          score: 29,
          durationSeconds: 30,
          displayName: demoUser.displayName,
        },
      });
    }

    // 追加几条演示动态，让首页播报区有内容（按标题匹配，避免 sortOrder 重排后错位）
    const demoExtraTitles = ["空仓起手", "山门初开", "灵气扰动"];
    const extraSeeds = ALL_LEVELS.filter((level) => demoExtraTitles.includes(level.title));
    const extraOffsetsMinutes = [18, 42, 95];

    for (let index = 0; index < extraSeeds.length; index += 1) {
      const levelSeed = extraSeeds[index];
      const level = await prisma.level.findFirst({
        where: { courseId: "mvp", title: levelSeed.title, status: "PUBLISHED" },
      });
      if (!level) {
        continue;
      }

      const existed = await prisma.levelResult.findUnique({
        where: { userId_levelId: { userId: demoUser.id, levelId: level.id } },
      });
      if (existed) {
        continue;
      }

      const offsetMinutes = extraOffsetsMinutes[index] ?? 60;
      const completedAt = new Date(Date.now() - offsetMinutes * 60 * 1000);
      const demoAttempt = await prisma.attempt.create({
        data: {
          userId: demoUser.id,
          levelId: level.id,
          status: "COMPLETED",
          currentState: toPrismaJson(levelSeed.initialState),
          stepCount: 3,
          completedAt,
        },
      });

      await prisma.levelResult.create({
        data: {
          userId: demoUser.id,
          levelId: level.id,
          attemptId: demoAttempt.id,
          score: 28 - index,
          durationSeconds: 45 + index * 10,
          commandCount: 3,
          completedAt,
        },
      });
    }
  }

  await normalizeLegacyPracticeScores();

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

  console.log(`种子数据写入完成：2 用户 + ${ALL_LEVELS.length} 关卡 + 演示排行榜`);
}

/**
 * 折算旧版 100 分制的通关得分。
 * 功能：更新 levelResult 中仍高于当前满分的记录，避免排行榜总分虚高。
 * 参数：无。
 * 返回值：Promise<void>。
 */
async function normalizeLegacyPracticeScores() {
  const legacyResults = await prisma.levelResult.findMany({
    where: { score: { gt: DEFAULT_LEVEL_BASE_SCORE } },
    select: { id: true, score: true },
  });

  for (const row of legacyResults) {
    const nextScore = convertLegacyPracticeScore(row.score);
    await prisma.levelResult.update({
      where: { id: row.id },
      data: { score: nextScore },
    });
  }

  if (legacyResults.length > 0) {
    console.log(`已折算 ${legacyResults.length} 条旧版通关得分（100 分制 → 30 分制）`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
