import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ALL_BADGES } from "../badges/badge.definitions";
import { LeaderboardService } from "../leaderboard/leaderboard.service";
import { PrismaService } from "../prisma/prisma.service";

/** 积分钱包列表查询参数 */
export interface AdminWalletListQuery {
  search?: string;
  page?: number;
  pageSize?: number;
}

/** 积分流水列表查询参数 */
export interface AdminLedgerListQuery {
  search?: string;
  userId?: bigint;
  page?: number;
  pageSize?: number;
}

/** 关卡解锁列表查询参数 */
export interface AdminUnlockListQuery {
  search?: string;
  userId?: bigint;
  levelId?: bigint;
  page?: number;
  pageSize?: number;
}

/**
 * 管理端游戏化运营服务。
 * 功能：积分钱包、流水、解锁记录、徽章定义与排行榜查询。
 * 参数：筛选与分页条件。
 * 返回值：分页列表或只读定义。
 */
@Injectable()
export class AdminGamificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leaderboardService: LeaderboardService,
  ) {}

  /**
   * 分页列出积分钱包。
   * 功能：支持按用户邮箱或昵称搜索。
   * 参数：query - 筛选与分页条件。
   * 返回值：分页钱包列表。
   */
  async listWallets(query: AdminWalletListQuery = {}) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where: Prisma.UserPointWalletWhereInput = {};

    if (query.search) {
      where.user = {
        OR: [
          { email: { contains: query.search } },
          { displayName: { contains: query.search } },
        ],
      };
    }

    const [total, wallets] = await Promise.all([
      this.prisma.userPointWallet.count({ where }),
      this.prisma.userPointWallet.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { balance: "desc" },
        include: {
          user: { select: { id: true, email: true, displayName: true } },
        },
      }),
    ]);

    return {
      items: wallets.map((wallet) => ({
        userId: wallet.userId.toString(),
        userEmail: wallet.user.email,
        userDisplayName: wallet.user.displayName,
        balance: wallet.balance,
        totalEarned: wallet.totalEarned,
        totalSpent: wallet.totalSpent,
        currentStreak: wallet.currentStreak,
        longestStreak: wallet.longestStreak,
        lastCheckInDate: wallet.lastCheckInDate,
        updatedAt: wallet.updatedAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  /**
   * 分页列出积分流水。
   * 功能：支持用户搜索与 userId 精确筛选。
   * 参数：query - 筛选与分页条件。
   * 返回值：分页流水列表。
   */
  async listLedgers(query: AdminLedgerListQuery = {}) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where: Prisma.PointLedgerWhereInput = {};

    if (query.userId) {
      where.userId = query.userId;
    }
    if (query.search) {
      where.user = {
        OR: [
          { email: { contains: query.search } },
          { displayName: { contains: query.search } },
        ],
      };
    }

    const [total, ledgers] = await Promise.all([
      this.prisma.pointLedger.count({ where }),
      this.prisma.pointLedger.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, email: true, displayName: true } },
        },
      }),
    ]);

    const levelIds = ledgers
      .map((item) => item.levelId)
      .filter((levelId): levelId is bigint => levelId !== null);
    const levels = levelIds.length
      ? await this.prisma.level.findMany({
          where: { id: { in: levelIds } },
          select: { id: true, title: true },
        })
      : [];
    const levelMap = new Map(levels.map((level) => [level.id.toString(), level.title]));

    return {
      items: ledgers.map((ledger) => ({
        id: ledger.id.toString(),
        userId: ledger.userId.toString(),
        userEmail: ledger.user.email,
        userDisplayName: ledger.user.displayName,
        delta: ledger.delta,
        balanceAfter: ledger.balanceAfter,
        reason: ledger.reason,
        levelId: ledger.levelId?.toString() ?? null,
        levelTitle: ledger.levelId ? levelMap.get(ledger.levelId.toString()) ?? null : null,
        createdAt: ledger.createdAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  /**
   * 分页列出关卡解锁记录。
   * 功能：支持用户搜索与 userId、levelId 筛选。
   * 参数：query - 筛选与分页条件。
   * 返回值：分页解锁列表。
   */
  async listUnlocks(query: AdminUnlockListQuery = {}) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where: Prisma.LevelUnlockWhereInput = {};

    if (query.userId) {
      where.userId = query.userId;
    }
    if (query.levelId) {
      where.levelId = query.levelId;
    }
    if (query.search) {
      where.user = {
        OR: [
          { email: { contains: query.search } },
          { displayName: { contains: query.search } },
        ],
      };
    }

    const [total, unlocks] = await Promise.all([
      this.prisma.levelUnlock.count({ where }),
      this.prisma.levelUnlock.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { unlockedAt: "desc" },
        include: {
          user: { select: { id: true, email: true, displayName: true } },
          level: { select: { id: true, title: true, chapterId: true } },
        },
      }),
    ]);

    return {
      items: unlocks.map((unlock) => ({
        id: unlock.id.toString(),
        userId: unlock.userId.toString(),
        userEmail: unlock.user.email,
        userDisplayName: unlock.user.displayName,
        levelId: unlock.levelId.toString(),
        levelTitle: unlock.level.title,
        levelChapterId: unlock.level.chapterId,
        cost: unlock.cost,
        unlockedAt: unlock.unlockedAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  /**
   * 获取徽章定义列表。
   * 功能：只读展示全部徽章静态配置。
   * 参数：无。
   * 返回值：徽章定义数组。
   */
  listBadgeDefinitions() {
    return ALL_BADGES.map((badge) => ({
      id: badge.id,
      category: badge.category,
      name: badge.name,
      description: badge.description,
      ability: badge.ability,
      iconKey: badge.iconKey,
      color: badge.color,
      visualTier: badge.visualTier,
      titleLevel: badge.titleLevel ?? null,
    }));
  }

  /**
   * 查询排行榜。
   * 功能：支持全局或单关排行榜。
   * 参数：levelId - 可选关卡 id；limit - 条数。
   * 返回值：排行榜条目数组。
   */
  getLeaderboard(levelId?: bigint, limit = 50) {
    return this.leaderboardService.getLeaderboard(levelId, limit);
  }

  /**
   * 管理员赠送积分。
   * 功能：按 userId 或 email 定位用户，增加余额并写入流水。
   * 参数：input - 目标用户标识与赠送数量。
   * 返回值：赠送后的钱包摘要。
   */
  async grantPoints(input: { userId?: string; email?: string; amount: number }) {
    if (!input.userId && !input.email) {
      throw new BadRequestException("请提供 userId 或 email");
    }

    const user = input.userId
      ? await this.prisma.user.findUnique({ where: { id: BigInt(input.userId) } })
      : await this.prisma.user.findUnique({ where: { email: input.email } });

    if (!user) {
      throw new NotFoundException("用户不存在");
    }

    const userId = user.id;
    const amount = input.amount;

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.userPointWallet.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });

      const newBalance = wallet.balance + amount;
      const updatedWallet = await tx.userPointWallet.update({
        where: { userId },
        data: {
          balance: newBalance,
          totalEarned: wallet.totalEarned + amount,
        },
      });

      await tx.pointLedger.create({
        data: {
          userId,
          delta: amount,
          balanceAfter: newBalance,
          reason: "ADMIN_GRANT",
        },
      });

      return {
        userId: userId.toString(),
        userEmail: user.email,
        userDisplayName: user.displayName,
        amount,
        balance: updatedWallet.balance,
        totalEarned: updatedWallet.totalEarned,
        totalSpent: updatedWallet.totalSpent,
      };
    });
  }
}
