import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { LevelGoal } from "../git-engine/repo-state.types";
import { fromPrismaJson } from "../common/json.util";
import {
  ALL_BADGES,
  RANK_TIERS,
  type RankDefinition,
  type RankTierId,
} from "./badge.definitions";
import { isBadgeUnlocked, type BadgeEvalContext } from "./badge.evaluators";

/** 用户徽章 DTO */
export interface UserBadgeDto {
  id: string;
  category: string;
  name: string;
  description: string;
  ability: string;
  iconKey: string;
  color: string;
  visualTier: number;
  titleLevel?: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

/** 当前称号摘要 */
export interface ActiveTitleDto {
  id: string;
  name: string;
  level: number;
  color: string;
  iconKey: string;
  visualTier: number;
}

/** 段位摘要 */
export interface RankDto {
  id: RankTierId;
  name: string;
  label: string;
}

/** 徽章页完整响应 */
export interface UserBadgesResponse {
  activeTitle: ActiveTitleDto | null;
  rank: RankDto;
  badges: UserBadgeDto[];
  unlockedCount: number;
  totalCount: number;
}

/**
 * 徽章服务。
 * 功能：评估解锁条件、持久化 UserBadge、返回成就页数据。
 */
@Injectable()
export class BadgesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 同步并返回用户徽章数据。
   * 功能：重新评估全部徽章条件，写入新解锁记录后返回完整列表。
   * 参数：userId - 用户 id。
   * 返回值：徽章页 DTO。
   */
  async syncAndGetUserBadges(userId: bigint): Promise<UserBadgesResponse> {
    const toUnlock = await this.evaluateUnlockableBadges(userId);
    if (toUnlock.length > 0) {
      await this.prisma.userBadge.createMany({
        data: toUnlock.map((badgeId) => ({ userId, badgeId })),
        skipDuplicates: true,
      });
    }
    return this.buildUserBadgesResponse(userId);
  }

  /**
   * 通关后增量评估徽章。
   * 功能：在 submitCommand 通关时调用，返回本次新解锁 id 列表。
   * 参数：userId - 用户 id。
   * 返回值：新解锁 badgeId 数组。
   */
  async syncAfterLevelComplete(userId: bigint): Promise<string[]> {
    const existing = await this.getUnlockedBadgeIds(userId);
    const toUnlock = await this.evaluateUnlockableBadges(userId);
    const freshIds = toUnlock.filter((badgeId) => !existing.has(badgeId));
    if (freshIds.length > 0) {
      await this.prisma.userBadge.createMany({
        data: freshIds.map((badgeId) => ({ userId, badgeId })),
        skipDuplicates: true,
      });
    }
    return freshIds;
  }

  /**
   * 获取当前称号与段位摘要。
   * 功能：供 stats 接口和顶栏展示，会先同步徽章。
   * 参数：userId - 用户 id。
   * 返回值：称号与段位。
   */
  async getTitleAndRankSummary(userId: bigint): Promise<{
    activeTitle: ActiveTitleDto | null;
    rank: RankDto;
  }> {
    const response = await this.syncAndGetUserBadges(userId);
    return {
      activeTitle: response.activeTitle,
      rank: response.rank,
    };
  }

  /**
   * 组装徽章页响应。
   * 功能：合并静态定义与解锁状态。
   * 参数：userId - 用户 id。
   * 返回值：UserBadgesResponse。
   */
  private async buildUserBadgesResponse(userId: bigint): Promise<UserBadgesResponse> {
    const unlockedRows = await this.prisma.userBadge.findMany({
      where: { userId },
      orderBy: { unlockedAt: "asc" },
    });
    const unlockedMap = new Map(unlockedRows.map((row) => [row.badgeId, row.unlockedAt]));

    const badges: UserBadgeDto[] = ALL_BADGES.map((def) => ({
      id: def.id,
      category: def.category,
      name: def.name,
      description: def.description,
      ability: def.ability,
      iconKey: def.iconKey,
      color: def.color,
      visualTier: def.visualTier,
      titleLevel: def.titleLevel,
      unlocked: unlockedMap.has(def.id),
      unlockedAt: unlockedMap.get(def.id)?.toISOString() ?? null,
    }));

    const activeTitle = this.resolveActiveTitle(badges);
    const rank = this.resolveRank(activeTitle, badges);

    return {
      activeTitle,
      rank,
      badges,
      unlockedCount: badges.filter((item) => item.unlocked).length,
      totalCount: badges.length,
    };
  }

  /**
   * 评估当前应解锁但尚未写入的 badgeId。
   * 功能：遍历全部徽章定义逐一判定。
   * 参数：userId - 用户 id。
   * 返回值：应解锁 badgeId 列表。
   */
  private async evaluateUnlockableBadges(userId: bigint): Promise<string[]> {
    const context = await this.buildEvalContext(userId);
    const existing = await this.getUnlockedBadgeIds(userId);
    const result: string[] = [];

    for (const badge of ALL_BADGES) {
      if (existing.has(badge.id)) {
        continue;
      }
      if (isBadgeUnlocked(badge.id, context)) {
        result.push(badge.id);
      }
    }
    return result;
  }

  /**
   * 读取用户已解锁 badgeId 集合。
   * 参数：userId - 用户 id。
   * 返回值：Set<badgeId>。
   */
  private async getUnlockedBadgeIds(userId: bigint): Promise<Set<string>> {
    const rows = await this.prisma.userBadge.findMany({
      where: { userId },
      select: { badgeId: true },
    });
    return new Set(rows.map((row) => row.badgeId));
  }

  /**
   * 构建徽章评估上下文。
   * 功能：一次性拉取用户通关、命令、关卡 goal 等数据。
   * 参数：userId - 用户 id。
   * 返回值：BadgeEvalContext。
   */
  private async buildEvalContext(userId: bigint): Promise<BadgeEvalContext> {
    const publishedLevels = await this.prisma.level.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, chapterId: true, goal: true, description: true },
    });
    const levelResults = await this.prisma.levelResult.findMany({
      where: { userId },
      select: { levelId: true, commandCount: true, score: true, attemptId: true },
    });
    const completedAttempts = await this.prisma.attempt.findMany({
      where: { userId, status: "COMPLETED" },
      select: { id: true, levelId: true },
    });
    const attemptIds = completedAttempts.map((item) => item.id);
    const commandRows =
      attemptIds.length > 0
        ? await this.prisma.attemptCommand.findMany({
            where: { attemptId: { in: attemptIds } },
            select: { attemptId: true, command: true, success: true },
            orderBy: { stepIndex: "asc" },
          })
        : [];

    const allUserCommands = await this.prisma.attemptCommand.findMany({
      where: { attempt: { userId } },
      select: {
        command: true,
        success: true,
        attemptId: true,
        attempt: { select: { levelId: true } },
      },
    });

    const levelChapterMap = new Map(publishedLevels.map((level) => [level.id, level.chapterId]));
    const publishedChapterIds = [
      ...new Set(
        publishedLevels
          .map((level) => level.chapterId)
          .filter((chapterId): chapterId is string => chapterId !== null),
      ),
    ];
    const publishedLevelMeta = new Map(
      publishedLevels.map((level) => [
        level.id,
        { chapterId: level.chapterId, description: level.description },
      ]),
    );
    const levelGoals = new Map<bigint, LevelGoal>();
    for (const level of publishedLevels) {
      levelGoals.set(level.id, fromPrismaJson<LevelGoal>(level.goal));
    }

    const clearedChapterIds: string[] = [];
    for (const result of levelResults) {
      const chapterId = levelChapterMap.get(result.levelId);
      if (chapterId && !clearedChapterIds.includes(chapterId)) {
        clearedChapterIds.push(chapterId);
      }
    }

    const completedAttemptCommands = new Map<
      bigint,
      { levelId: bigint; chapterId: string | null; commands: Array<{ command: string; success: boolean }> }
    >();
    for (const attempt of completedAttempts) {
      const commands = commandRows
        .filter((row) => row.attemptId === attempt.id)
        .map((row) => ({ command: row.command, success: row.success }));
      completedAttemptCommands.set(attempt.id, {
        levelId: attempt.levelId,
        chapterId: levelChapterMap.get(attempt.levelId) ?? null,
        commands,
      });
    }

    return {
      publishedLevelCount: publishedLevels.length,
      publishedChapterIds,
      completedLevelIds: levelResults.map((item) => item.levelId),
      clearedChapterIds,
      totalScore: levelResults.reduce((sum, item) => sum + item.score, 0),
      allCommands: allUserCommands.map((row) => ({
        command: row.command,
        success: row.success,
        attemptId: row.attemptId,
        levelId: row.attempt.levelId,
      })),
      completedAttemptCommands,
      levelGoals,
      publishedLevelMeta,
      levelResults,
    };
  }

  /**
   * 解析当前生效的最高主线称号。
   * 参数：badges - 带解锁状态的徽章列表。
   * 返回值：最高称号或 null。
   */
  private resolveActiveTitle(badges: UserBadgeDto[]): ActiveTitleDto | null {
    const unlockedTitles = badges
      .filter((item) => item.category === "title" && item.unlocked && item.titleLevel)
      .sort((a, b) => (b.titleLevel ?? 0) - (a.titleLevel ?? 0));

    const top = unlockedTitles[0];
    if (!top || !top.titleLevel) {
      return null;
    }

    return {
      id: top.id,
      name: top.name,
      level: top.titleLevel,
      color: top.color,
      iconKey: top.iconKey,
      visualTier: top.visualTier,
    };
  }

  /**
   * 根据称号与成就进度解析段位。
   * 参数：activeTitle - 当前称号；badges - 徽章列表。
   * 返回值：段位 DTO。
   */
  private resolveRank(activeTitle: ActiveTitleDto | null, badges: UserBadgeDto[]): RankDto {
    const titleLevel = activeTitle?.level ?? 0;
    const commandUnlocked = badges.filter((item) => item.category === "command" && item.unlocked).length;
    const resultUnlocked = badges.filter((item) => item.category === "result" && item.unlocked).length;
    const allCommandDone = commandUnlocked >= 10;
    const allResultDone = resultUnlocked >= 5;

    let rank: RankDefinition = RANK_TIERS[0];
    for (const tier of RANK_TIERS) {
      if (titleLevel >= tier.minTitleLevel) {
        rank = tier;
      }
    }

    if (titleLevel >= 10 && allCommandDone && allResultDone) {
      rank = RANK_TIERS.find((item) => item.id === "immortal") ?? rank;
    } else if (titleLevel >= 10) {
      rank = RANK_TIERS.find((item) => item.id === "master") ?? rank;
    }

    return {
      id: rank.id,
      name: rank.name,
      label: rank.label,
    };
  }
}
