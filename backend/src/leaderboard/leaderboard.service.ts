import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/** 排行榜 upsert 参数 */
export interface LeaderboardUpsertInput {
  userId: bigint;
  levelId: bigint;
  score: number;
  durationSeconds: number;
  displayName: string;
}

/**
 * 排行榜服务。
 * 功能：查询和更新排行榜条目。
 * 参数：levelId、limit 或 upsert 输入。
 * 返回值：排行榜数据。
 */
@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取排行榜列表。
   * 功能：按 score 降序、duration 升序排列。
   * 参数：levelId - 可选关卡过滤；limit - 条数。
   * 返回值：排行榜条目。
   */
  async getLeaderboard(levelId?: bigint, limit = 20) {
    const entries = await this.prisma.leaderboardEntry.findMany({
      where: levelId ? { levelId } : undefined,
      orderBy: [{ score: "desc" }, { durationSeconds: "asc" }],
      take: limit,
    });

    return entries.map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId.toString(),
      levelId: entry.levelId.toString(),
      displayName: entry.displayName,
      score: entry.score,
      durationSeconds: entry.durationSeconds,
      updatedAt: entry.updatedAt,
    }));
  }

  /**
   * 更新或插入排行榜条目。
   * 功能：通关后写入，若已有更高分则保留更高分。
   * 参数：input - upsert 参数。
   * 返回值：无。
   */
  async upsertEntry(input: LeaderboardUpsertInput) {
    const existing = await this.prisma.leaderboardEntry.findUnique({
      where: { userId_levelId: { userId: input.userId, levelId: input.levelId } },
    });

    if (existing && existing.score > input.score) {
      return;
    }

    await this.prisma.leaderboardEntry.upsert({
      where: { userId_levelId: { userId: input.userId, levelId: input.levelId } },
      create: {
        userId: input.userId,
        levelId: input.levelId,
        score: input.score,
        durationSeconds: input.durationSeconds,
        displayName: input.displayName,
      },
      update: {
        score: input.score,
        durationSeconds: input.durationSeconds,
        displayName: input.displayName,
      },
    });
  }
}
