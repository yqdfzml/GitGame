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

/** 做题积分排行榜条目（各关通关得分之和） */
export interface PracticeScoreLeaderboardItem {
  rank: number;
  userId: string;
  displayName: string;
  /** 玩家头像 URL，未设置时为 null */
  avatarUrl: string | null;
  practiceScore: number;
  completedLevels: number;
}

/** 单关得分排行榜条目 */
export interface LevelScoreLeaderboardItem {
  rank: number;
  userId: string;
  levelId: string;
  levelTitle: string;
  chapterId: string | null;
  displayName: string;
  /** 玩家头像 URL，未设置时为 null */
  avatarUrl: string | null;
  score: number;
  durationSeconds: number;
  updatedAt: Date;
}

/**
 * 排行榜服务。
 * 功能：全局按做题积分（各关得分之和）排序，指定关卡时按单关得分排序。
 * 参数：levelId、limit 或 upsert 输入。
 * 返回值：排行榜数据。
 */
@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取排行榜列表。
   * 功能：未传 levelId 时按做题积分降序；传 levelId 时按关卡得分排序。
   * 参数：levelId - 可选关卡过滤；limit - 条数。
   * 返回值：排行榜条目。
   */
  async getLeaderboard(levelId?: bigint, limit = 20): Promise<PracticeScoreLeaderboardItem[] | LevelScoreLeaderboardItem[]> {
    if (levelId) {
      return this.getLevelScoreLeaderboard(levelId, limit);
    }
    return this.getPracticeScoreLeaderboard(limit);
  }

  /**
   * 获取做题积分排行榜。
   * 功能：汇总各关 levelResult.score，按总分降序排列。
   * 参数：limit - 返回条数上限。
   * 返回值：做题积分排行榜条目数组。
   */
  private async getPracticeScoreLeaderboard(limit: number): Promise<PracticeScoreLeaderboardItem[]> {
    const grouped = await this.prisma.levelResult.groupBy({
      by: ["userId"],
      _sum: { score: true },
      _count: { levelId: true },
      orderBy: [{ _sum: { score: "desc" } }, { _count: { levelId: "desc" } }],
      take: limit,
    });

    if (grouped.length === 0) {
      return [];
    }

    const userIds = grouped.map((row) => row.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, displayName: true, avatarUrl: true },
    });
    /** 用户展示名映射，key 为 userId 字符串 */
    const displayNameMap = new Map(users.map((user) => [user.id.toString(), user.displayName]));
    /** 用户头像映射，key 为 userId 字符串 */
    const avatarUrlMap = new Map(users.map((user) => [user.id.toString(), user.avatarUrl]));

    return grouped.map((row, index) => ({
      rank: index + 1,
      userId: row.userId.toString(),
      displayName: displayNameMap.get(row.userId.toString()) ?? "未知用户",
      avatarUrl: avatarUrlMap.get(row.userId.toString()) ?? null,
      practiceScore: row._sum.score ?? 0,
      completedLevels: row._count.levelId,
    }));
  }

  /**
   * 获取单关得分排行榜。
   * 功能：按 score 降序、duration 升序排列。
   * 参数：levelId - 关卡 id；limit - 返回条数上限。
   * 返回值：单关得分排行榜条目数组。
   */
  private async getLevelScoreLeaderboard(levelId: bigint, limit: number): Promise<LevelScoreLeaderboardItem[]> {
    const results = await this.prisma.levelResult.findMany({
      where: { levelId },
      orderBy: [{ score: "desc" }, { durationSeconds: "asc" }],
      take: limit,
      include: {
        user: { select: { displayName: true, avatarUrl: true } },
        level: { select: { title: true, chapterId: true } },
      },
    });

    return results.map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId.toString(),
      levelId: entry.levelId.toString(),
      levelTitle: entry.level.title,
      chapterId: entry.level.chapterId,
      displayName: entry.user.displayName,
      avatarUrl: entry.user.avatarUrl,
      score: entry.score,
      durationSeconds: entry.durationSeconds,
      updatedAt: entry.completedAt,
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
