import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import type { Difficulty } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type {
  CheckInCalendarResponse,
  LevelUnlockState,
  NextLevelAfterComplete,
  PointWalletResponse,
} from "./points.constants";
import {
  addShanghaiDays,
  calcCheckInPoints,
  calcNextStreakDay,
  calcUnlockCost,
  formatShanghaiDate,
  getSundayOnOrBefore,
  isFreePublishedLevel,
  parseDateOnly,
  toDateText,
} from "./points.util";

/** 已发布关卡排序元数据，用于免费区与定价计算 */
interface PublishedLevelMeta {
  id: bigint;
  difficulty: Difficulty;
  publishedIndex: number;
  title: string;
}

/**
 * 积分与签到服务。
 * 功能：管理签到、钱包、关卡解锁与开始权限校验。
 * 参数：userId、levelId 等。
 * 返回值：钱包摘要、解锁状态等 DTO。
 */
@Injectable()
export class PointsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取积分钱包摘要。
   * 功能：返回余额、连签与今日签到状态。
   * 参数：userId - 用户 id。
   * 返回值：PointWalletResponse。
   */
  async getWalletSummary(userId: bigint): Promise<PointWalletResponse> {
    const wallet = await this.ensureWallet(userId);
    const today = formatShanghaiDate(new Date());
    const lastCheckInDate = toDateText(wallet.lastCheckInDate);

    return {
      balance: wallet.balance,
      totalEarned: wallet.totalEarned,
      totalSpent: wallet.totalSpent,
      currentStreak: wallet.currentStreak,
      longestStreak: wallet.longestStreak,
      checkedInToday: lastCheckInDate === today,
      lastCheckInDate,
    };
  }

  /**
   * 每日签到。
   * 功能：按上海自然日幂等签到，发放积分并更新连签。
   * 参数：userId - 用户 id。
   * 返回值：签到后的钱包摘要。
   */
  /**
   * 获取近一年签到日历数据。
   * 功能：返回 GitHub 风格热力图所需的日期与积分。
   * 参数：userId - 用户 id。
   * 返回值：CheckInCalendarResponse。
   */
  async getCheckInCalendar(userId: bigint): Promise<CheckInCalendarResponse> {
    const endDate = formatShanghaiDate(new Date());
    const rawStartDate = addShanghaiDays(endDate, -364);
    const startDate = getSundayOnOrBefore(rawStartDate);

    const rows = await this.prisma.dailyCheckIn.findMany({
      where: {
        userId,
        checkInDate: {
          gte: parseDateOnly(startDate),
          lte: parseDateOnly(endDate),
        },
      },
      select: {
        checkInDate: true,
        pointsAwarded: true,
      },
      orderBy: { checkInDate: "asc" },
    });

    return {
      startDate,
      endDate,
      days: rows.map((row) => ({
        date: toDateText(row.checkInDate)!,
        pointsAwarded: row.pointsAwarded,
      })),
    };
  }

  async checkIn(userId: bigint): Promise<PointWalletResponse> {
    const today = formatShanghaiDate(new Date());
    const todayDate = parseDateOnly(today);

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.userPointWallet.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });

      const lastCheckInDate = toDateText(wallet.lastCheckInDate);
      if (lastCheckInDate === today) {
        return this.buildWalletResponse(wallet, today);
      }

      const streakDay = calcNextStreakDay(lastCheckInDate, today, wallet.currentStreak);
      const pointsAwarded = calcCheckInPoints(streakDay);
      const newBalance = wallet.balance + pointsAwarded;
      const newLongestStreak = Math.max(wallet.longestStreak, streakDay);

      await tx.dailyCheckIn.create({
        data: {
          userId,
          checkInDate: todayDate,
          pointsAwarded,
          streakDay,
        },
      });

      const updatedWallet = await tx.userPointWallet.update({
        where: { userId },
        data: {
          balance: newBalance,
          totalEarned: wallet.totalEarned + pointsAwarded,
          currentStreak: streakDay,
          longestStreak: newLongestStreak,
          lastCheckInDate: todayDate,
        },
      });

      await tx.pointLedger.create({
        data: {
          userId,
          delta: pointsAwarded,
          balanceAfter: newBalance,
          reason: "CHECK_IN",
        },
      });

      return this.buildWalletResponse(updatedWallet, today);
    });
  }

  /**
   * 解锁关卡。
   * 功能：事务内校验余额并扣积分，写入解锁记录。
   * 参数：userId - 用户 id；levelId - 关卡 id。
   * 返回值：解锁后的关卡状态。
   */
  async unlockLevel(userId: bigint, levelId: bigint): Promise<LevelUnlockState> {
    const publishedLevels = await this.loadPublishedLevelMeta();
    const targetMeta = publishedLevels.find((item) => item.id === levelId);
    if (!targetMeta) {
      throw new BadRequestException("关卡不存在或未发布");
    }

    const unlockState = await this.resolveUnlockState(userId, targetMeta, publishedLevels);
    if (unlockState.canStart) {
      return unlockState;
    }

    const cost = unlockState.unlockCost;
    if (cost <= 0) {
      return unlockState;
    }

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.userPointWallet.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });

      const existingUnlock = await tx.levelUnlock.findUnique({
        where: { userId_levelId: { userId, levelId } },
      });
      if (existingUnlock) {
        return this.resolveUnlockState(userId, targetMeta, publishedLevels);
      }

      const completed = await tx.levelResult.findUnique({
        where: { userId_levelId: { userId, levelId } },
      });
      if (completed) {
        return this.resolveUnlockState(userId, targetMeta, publishedLevels);
      }

      if (wallet.balance < cost) {
        throw new BadRequestException("积分不足，无法解锁该关卡");
      }

      const newBalance = wallet.balance - cost;
      await tx.userPointWallet.update({
        where: { userId },
        data: {
          balance: newBalance,
          totalSpent: wallet.totalSpent + cost,
        },
      });

      await tx.levelUnlock.create({
        data: {
          userId,
          levelId,
          cost,
        },
      });

      await tx.pointLedger.create({
        data: {
          userId,
          delta: -cost,
          balanceAfter: newBalance,
          reason: "UNLOCK_LEVEL",
          levelId,
        },
      });

      return {
        unlockStatus: "unlocked" as const,
        unlockCost: cost,
        canStart: true,
      };
    });
  }

  /**
   * 查询单关解锁状态。
   * 功能：供关卡列表与详情使用。
   * 参数：userId - 用户 id，可为空；levelId - 关卡 id。
   * 返回值：LevelUnlockState。
   */
  async getUnlockState(userId: bigint | undefined, levelId: bigint): Promise<LevelUnlockState> {
    const publishedLevels = await this.loadPublishedLevelMeta();
    const targetMeta = publishedLevels.find((item) => item.id === levelId);
    if (!targetMeta) {
      throw new BadRequestException("关卡不存在或未发布");
    }
    return this.resolveUnlockState(userId, targetMeta, publishedLevels);
  }

  /**
   * 断言用户可开始关卡。
   * 功能：未解锁时抛 403，供 attempt 创建与关卡详情使用。
   * 参数：userId - 用户 id；levelId - 关卡 id。
   * 返回值：无。
   */
  async assertLevelStartable(userId: bigint, levelId: bigint): Promise<void> {
    const state = await this.getUnlockState(userId, levelId);
    if (!state.canStart) {
      throw new ForbiddenException("关卡未解锁，请先消耗积分解锁");
    }
  }

  /**
   * 通关后尝试自动解锁下一关。
   * 功能：找到路径上下一关，积分足够时自动扣分解锁。
   * 参数：userId - 用户 id；completedLevelId - 刚通关的关卡 id。
   * 返回值：下一关信息，无下一关时返回 null。
   */
  async tryAutoUnlockNextLevel(
    userId: bigint,
    completedLevelId: bigint,
  ): Promise<NextLevelAfterComplete | null> {
    const publishedLevels = await this.loadPublishedLevelMeta();
    const currentIndex = publishedLevels.findIndex((item) => item.id === completedLevelId);
    if (currentIndex === -1 || currentIndex >= publishedLevels.length - 1) {
      return null;
    }

    const nextMeta = publishedLevels[currentIndex + 1];
    const unlockState = await this.resolveUnlockState(userId, nextMeta, publishedLevels);

    const baseResult: NextLevelAfterComplete = {
      levelId: nextMeta.id.toString(),
      title: nextMeta.title,
      canStart: unlockState.canStart,
      autoUnlocked: false,
      unlockCost: unlockState.unlockCost,
    };

    if (unlockState.canStart) {
      return baseResult;
    }

    const wallet = await this.ensureWallet(userId);
    if (wallet.balance < unlockState.unlockCost) {
      return baseResult;
    }

    await this.unlockLevel(userId, nextMeta.id);

    return {
      ...baseResult,
      canStart: true,
      autoUnlocked: true,
    };
  }

  /**
   * 批量计算已发布关卡的解锁状态。
   * 功能：供关卡列表一次性返回 unlockStatus。
   * 参数：userId - 用户 id，可为空。
   * 返回值：levelId 到解锁状态的映射。
   */
  async buildUnlockStateMap(userId: bigint | undefined): Promise<Map<string, LevelUnlockState>> {
    const publishedLevels = await this.loadPublishedLevelMeta();
    const completedIds = userId ? await this.loadCompletedLevelIds(userId) : new Set<string>();
    const unlockedIds = userId ? await this.loadUnlockedLevelIds(userId) : new Set<string>();
    const stateMap = new Map<string, LevelUnlockState>();

    for (const meta of publishedLevels) {
      const levelIdText = meta.id.toString();
      const state = this.buildUnlockState(meta, completedIds, unlockedIds, userId !== undefined);
      stateMap.set(levelIdText, state);
    }

    return stateMap;
  }

  /**
   * 确保用户钱包存在。
   * 功能：首次访问积分功能时创建空钱包。
   * 参数：userId - 用户 id。
   * 返回值：UserPointWallet 实体。
   */
  private async ensureWallet(userId: bigint) {
    return this.prisma.userPointWallet.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  /**
   * 加载已发布关卡排序元数据。
   * 功能：全局 sortOrder 决定免费前 3 关与解锁价格。
   * 参数：无。
   * 返回值：PublishedLevelMeta 数组。
   */
  private async loadPublishedLevelMeta(): Promise<PublishedLevelMeta[]> {
    const levels = await this.prisma.level.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ courseId: "asc" }, { sortOrder: "asc" }],
      select: {
        id: true,
        difficulty: true,
        title: true,
      },
    });

    return levels.map((level, index) => ({
      id: level.id,
      difficulty: level.difficulty,
      publishedIndex: index,
      title: level.title,
    }));
  }

  /**
   * 解析单关解锁状态。
   * 功能：综合免费区、通关、积分解锁记录。
   * 参数：userId - 用户 id；targetMeta - 目标关卡元数据；publishedLevels - 全部已发布关卡。
   * 返回值：LevelUnlockState。
   */
  private async resolveUnlockState(
    userId: bigint | undefined,
    targetMeta: PublishedLevelMeta,
    publishedLevels: PublishedLevelMeta[],
  ): Promise<LevelUnlockState> {
    const completedIds = userId ? await this.loadCompletedLevelIds(userId) : new Set<string>();
    const unlockedIds = userId ? await this.loadUnlockedLevelIds(userId) : new Set<string>();
    return this.buildUnlockState(targetMeta, completedIds, unlockedIds, userId !== undefined);
  }

  /**
   * 根据内存集合计算单关解锁状态。
   * 功能：避免列表接口对每个关卡单独查库。
   * 参数：meta - 关卡元数据；completedIds - 已通关集合；unlockedIds - 已积分解锁集合；isLoggedIn - 是否登录。
   * 返回值：LevelUnlockState。
   */
  private buildUnlockState(
    meta: PublishedLevelMeta,
    completedIds: Set<string>,
    unlockedIds: Set<string>,
    isLoggedIn: boolean,
  ): LevelUnlockState {
    const levelIdText = meta.id.toString();
    const unlockCost = calcUnlockCost(meta.difficulty, meta.publishedIndex);

    if (completedIds.has(levelIdText)) {
      return {
        unlockStatus: "completed",
        unlockCost,
        canStart: isLoggedIn,
      };
    }

    if (isFreePublishedLevel(meta.publishedIndex)) {
      return {
        unlockStatus: "free",
        unlockCost: 0,
        canStart: isLoggedIn,
      };
    }

    if (unlockedIds.has(levelIdText)) {
      return {
        unlockStatus: "unlocked",
        unlockCost,
        canStart: isLoggedIn,
      };
    }

    return {
      unlockStatus: "locked",
      unlockCost,
      canStart: false,
    };
  }

  /**
   * 加载用户已通关关卡 id 集合。
   * 功能：已通关永久视为可开始。
   * 参数：userId - 用户 id。
   * 返回值：levelId 字符串 Set。
   */
  private async loadCompletedLevelIds(userId: bigint): Promise<Set<string>> {
    const rows = await this.prisma.levelResult.findMany({
      where: { userId },
      select: { levelId: true },
    });
    return new Set(rows.map((row) => row.levelId.toString()));
  }

  /**
   * 加载用户积分解锁关卡 id 集合。
   * 功能：识别已付费解锁但未通关的关卡。
   * 参数：userId - 用户 id。
   * 返回值：levelId 字符串 Set。
   */
  private async loadUnlockedLevelIds(userId: bigint): Promise<Set<string>> {
    const rows = await this.prisma.levelUnlock.findMany({
      where: { userId },
      select: { levelId: true },
    });
    return new Set(rows.map((row) => row.levelId.toString()));
  }

  /**
   * 将钱包实体转成响应 DTO。
   * 功能：统一 checkIn 与 getWalletSummary 返回结构。
   * 参数：wallet - 钱包实体；today - 当前上海自然日。
   * 返回值：PointWalletResponse。
   */
  private buildWalletResponse(
    wallet: {
      balance: number;
      totalEarned: number;
      totalSpent: number;
      currentStreak: number;
      longestStreak: number;
      lastCheckInDate: Date | null;
    },
    today: string,
  ): PointWalletResponse {
    const lastCheckInDate = toDateText(wallet.lastCheckInDate);
    return {
      balance: wallet.balance,
      totalEarned: wallet.totalEarned,
      totalSpent: wallet.totalSpent,
      currentStreak: wallet.currentStreak,
      longestStreak: wallet.longestStreak,
      checkedInToday: lastCheckInDate === today,
      lastCheckInDate,
    };
  }
}
