import { Injectable } from "@nestjs/common";
import { findBadgeDefinition } from "../badges/badge.definitions";
import { LeaderboardService } from "../leaderboard/leaderboard.service";
import { PrismaService } from "../prisma/prisma.service";

/** 首页排行榜条目 */
export interface HomeLeaderboardItem {
  rank: number;
  displayName: string;
  /** 玩家头像 URL，未设置时为 null */
  avatarUrl: string | null;
  practiceScore: number;
  completedLevels: number;
}

/** 首页动态条目类型 */
export type HomeActivityType = "level_clear" | "badge_unlock";

/** 首页通关动态条目 */
export interface HomeActivityItem {
  id: string;
  type: HomeActivityType;
  displayName: string;
  levelTitle: string | null;
  badgeName: string | null;
  score: number | null;
  happenedAt: string;
  message: string;
}

/** 首页概览响应 */
export interface HomeOverviewResponse {
  leaderboard: HomeLeaderboardItem[];
  activities: HomeActivityItem[];
}

/**
 * 首页服务。
 * 功能：聚合排行榜与最近通关/徽章动态，供首页展示。
 */
@Injectable()
export class HomeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leaderboardService: LeaderboardService,
  ) {}

  /**
   * 获取首页概览数据。
   * 功能：返回做题积分 Top 排行榜与按时间排序的通关动态。
   * 参数：leaderboardLimit - 排行榜条数；activityLimit - 动态条数。
   * 返回值：HomeOverviewResponse。
   */
  async getOverview(leaderboardLimit = 10, activityLimit = 20): Promise<HomeOverviewResponse> {
    const [leaderboardRows, levelActivities, badgeActivities] = await Promise.all([
      this.leaderboardService.getLeaderboard(undefined, leaderboardLimit),
      this.loadLevelClearActivities(activityLimit),
      this.loadBadgeUnlockActivities(activityLimit),
    ]);

    const activities = [...levelActivities, ...badgeActivities]
      .sort((a, b) => new Date(b.happenedAt).getTime() - new Date(a.happenedAt).getTime())
      .slice(0, activityLimit);

    return {
      leaderboard: leaderboardRows as HomeLeaderboardItem[],
      activities,
    };
  }

  /**
   * 读取最近关卡通关动态。
   * 功能：按 completedAt 倒序取最新记录。
   * 参数：limit - 条数上限。
   * 返回值：动态条目数组。
   */
  private async loadLevelClearActivities(limit: number): Promise<HomeActivityItem[]> {
    const rows = await this.prisma.levelResult.findMany({
      orderBy: { completedAt: "desc" },
      take: limit,
      include: {
        user: { select: { displayName: true } },
        level: { select: { title: true } },
      },
    });

    return rows.map((row) => ({
      id: `level-${row.id.toString()}`,
      type: "level_clear" as const,
      displayName: row.user.displayName,
      levelTitle: row.level.title,
      badgeName: null,
      score: row.score,
      happenedAt: row.completedAt.toISOString(),
      message: `通关「${row.level.title}」，得分 ${row.score}`,
    }));
  }

  /**
   * 读取最近徽章解锁动态。
   * 功能：按 unlockedAt 倒序取最新记录。
   * 参数：limit - 条数上限。
   * 返回值：动态条目数组。
   */
  private async loadBadgeUnlockActivities(limit: number): Promise<HomeActivityItem[]> {
    const rows = await this.prisma.userBadge.findMany({
      orderBy: { unlockedAt: "desc" },
      take: limit,
      include: {
        user: { select: { displayName: true } },
      },
    });

    return rows.map((row) => {
      const badge = findBadgeDefinition(row.badgeId);
      const badgeName = badge?.name ?? row.badgeId;
      return {
        id: `badge-${row.id.toString()}`,
        type: "badge_unlock" as const,
        displayName: row.user.displayName,
        levelTitle: null,
        badgeName,
        score: null,
        happenedAt: row.unlockedAt.toISOString(),
        message: `解锁徽章「${badgeName}」`,
      };
    });
  }
}
