import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { toPrismaJson } from "../src/common/json.util";
import { ALL_LEVELS } from "./level-definitions";

const prisma = new PrismaClient();

/**
 * 数据库种子脚本。
 * 功能：创建管理员、演示用户和完整 40 个教学关卡。
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

  // 下架旧版关卡
  await prisma.level.updateMany({
    where: { courseId: { in: ["basics", "workflow"] } },
    data: { status: "DRAFT" },
  });

  for (const level of ALL_LEVELS) {
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
      await prisma.level.update({ where: { id: existing.id }, data: levelData });
    } else {
      await prisma.level.create({ data: levelData });
    }
  }

  // 下架不在 40 关列表中的旧 mvp 关卡（例如旧 sortOrder 重复项）
  const validKeys = new Set(ALL_LEVELS.map((l) => `${l.chapterId}:${l.sortOrder}`));
  const publishedMvp = await prisma.level.findMany({ where: { courseId: "mvp", status: "PUBLISHED" } });
  for (const old of publishedMvp) {
    const key = `${old.chapterId}:${old.sortOrder}`;
    if (!validKeys.has(key)) {
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

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
