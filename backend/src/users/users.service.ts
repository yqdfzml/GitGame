import { Injectable } from "@nestjs/common";
import { BadgesService } from "../badges/badges.service";
import { PrismaService } from "../prisma/prisma.service";

/**
 * 用户服务。
 * 功能：查询用户学习统计数据。
 * 参数：userId - 用户主键。
 * 返回值：统计对象。
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly badgesService: BadgesService,
  ) {}

  /**
   * 获取用户学习统计。
   * 功能：汇总通关关卡数、总得分、最近练习。
   * 参数：userId - 用户 id。
   * 返回值：统计摘要。
   */
  async getUserStats(userId: bigint) {
    const completedCount = await this.prisma.levelResult.count({ where: { userId } });
    const allResults = await this.prisma.levelResult.findMany({
      where: { userId },
      select: { levelId: true, score: true, completedAt: true },
      orderBy: { completedAt: "desc" },
    });
    const results = await this.prisma.levelResult.findMany({
      where: { userId },
      orderBy: { completedAt: "desc" },
      take: 5,
      include: { level: { select: { id: true, title: true, courseId: true } } },
    });

    const totalScore = allResults.reduce((sum, item) => sum + item.score, 0);
    const titleSummary = await this.badgesService.getTitleAndRankSummary(userId);

    return {
      completedLevelCount: completedCount,
      totalScore,
      completedLevelIds: allResults.map((item) => item.levelId.toString()),
      activeTitle: titleSummary.activeTitle,
      rank: titleSummary.rank,
      recentResults: results.map((item) => ({
        levelId: item.levelId.toString(),
        title: item.level.title,
        courseId: item.level.courseId,
        score: item.score,
        durationSeconds: item.durationSeconds,
        completedAt: item.completedAt,
      })),
    };
  }
}
