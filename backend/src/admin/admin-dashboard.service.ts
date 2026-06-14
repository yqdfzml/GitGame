import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { findBadgeDefinition } from "../badges/badge.definitions";

/**
 * 管理端 Dashboard 服务。
 * 功能：汇总今日运营指标、最近动态与待处理事项。
 * 参数：无。
 * 返回值：Dashboard 概览对象。
 */
@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取 Dashboard 概览。
   * 功能：统计今日注册、活跃、通关、失败 attempt，并列出待处理事项。
   * 参数：无。
   * 返回值：Dashboard 数据。
   */
  async getOverview() {
    const todayStart = this.getTodayStart();

    const [
      todayRegistrations,
      activeUsers,
      completionsToday,
      failedAttemptsToday,
      draftLevelCount,
      recentClears,
      recentBadgeUnlocks,
      highAbandonLevels,
    ] = await Promise.all([
      this.prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.user.count({ where: { lastLoginAt: { gte: todayStart } } }),
      this.prisma.levelResult.count({ where: { completedAt: { gte: todayStart } } }),
      this.prisma.attempt.count({
        where: { status: "ABANDONED", startedAt: { gte: todayStart } },
      }),
      this.prisma.level.count({ where: { status: "DRAFT" } }),
      this.loadRecentClears(8),
      this.loadRecentBadgeUnlocks(8),
      this.loadHighAbandonLevels(5),
    ]);

    return {
      stats: {
        todayRegistrations,
        activeUsers,
        completionsToday,
        failedAttemptsToday,
      },
      pending: {
        draftLevelCount,
        highAbandonLevels,
      },
      recentClears,
      recentBadgeUnlocks,
    };
  }

  /**
   * 读取最近通关动态。
   * 功能：按完成时间倒序取最新记录。
   * 参数：limit - 条数上限。
   * 返回值：动态数组。
   */
  private async loadRecentClears(limit: number) {
    const rows = await this.prisma.levelResult.findMany({
      orderBy: { completedAt: "desc" },
      take: limit,
      include: {
        user: { select: { displayName: true } },
        level: { select: { title: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id.toString(),
      displayName: row.user.displayName,
      levelTitle: row.level.title,
      score: row.score,
      happenedAt: row.completedAt,
    }));
  }

  /**
   * 读取最近徽章解锁动态。
   * 功能：按解锁时间倒序取最新记录。
   * 参数：limit - 条数上限。
   * 返回值：动态数组。
   */
  private async loadRecentBadgeUnlocks(limit: number) {
    const rows = await this.prisma.userBadge.findMany({
      orderBy: { unlockedAt: "desc" },
      take: limit,
      include: {
        user: { select: { displayName: true } },
      },
    });

    return rows.map((row) => {
      const badge = findBadgeDefinition(row.badgeId);
      return {
        id: row.id.toString(),
        displayName: row.user.displayName,
        badgeName: badge?.name ?? row.badgeId,
        happenedAt: row.unlockedAt,
      };
    });
  }

  /**
   * 读取高放弃率关卡。
   * 功能：按 ABANDONED attempt 数量倒序，帮助发现难关卡。
   * 参数：limit - 条数上限。
   * 返回值：关卡统计数组。
   */
  private async loadHighAbandonLevels(limit: number) {
    const grouped = await this.prisma.attempt.groupBy({
      by: ["levelId"],
      where: { status: "ABANDONED" },
      _count: { _all: true },
    });

    grouped.sort((left, right) => right._count._all - left._count._all);
    const topGroups = grouped.slice(0, limit);

    const levelIds = topGroups.map((item) => item.levelId);
    const levels = await this.prisma.level.findMany({
      where: { id: { in: levelIds } },
      select: { id: true, title: true, status: true },
    });
    const levelMap = new Map(levels.map((level) => [level.id.toString(), level]));

    return topGroups.map((item) => {
      const level = levelMap.get(item.levelId.toString());
      return {
        levelId: item.levelId.toString(),
        levelTitle: level?.title ?? "未知关卡",
        levelStatus: level?.status ?? "UNKNOWN",
        abandonedCount: item._count._all,
      };
    });
  }

  /**
   * 获取今日零点时间。
   * 功能：以本地服务器时区计算当天开始时刻。
   * 参数：无。
   * 返回值：Date 对象。
   */
  private getTodayStart() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
}
