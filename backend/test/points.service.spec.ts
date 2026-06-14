import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as pointsUtil from "../src/points/points.util";
import { PointsService } from "../src/points/points.service";

/**
 * 构造 Prisma 事务 mock。
 * 功能：让 $transaction 直接执行回调。
 * 参数：tx - 事务客户端 mock。
 * 返回值：mock 函数。
 */
function mockTransaction(tx: Record<string, unknown>) {
  return vi.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx));
}

describe("PointsService", () => {
  /** 被测服务 */
  let service: PointsService;
  /** Prisma mock */
  let prisma: Record<string, unknown>;

  beforeEach(() => {
    vi.restoreAllMocks();

    prisma = {
      userPointWallet: {
        upsert: vi.fn(),
        update: vi.fn(),
      },
      dailyCheckIn: {
        create: vi.fn(),
      },
      pointLedger: {
        create: vi.fn(),
      },
      levelUnlock: {
        findUnique: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
      levelResult: {
        findUnique: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
      level: {
        findMany: vi.fn().mockResolvedValue([
          { id: 1n, difficulty: "BEGINNER", title: "关1" },
          { id: 2n, difficulty: "BEGINNER", title: "关2" },
          { id: 3n, difficulty: "BEGINNER", title: "关3" },
          { id: 4n, difficulty: "INTERMEDIATE", title: "关4" },
        ]),
      },
      $transaction: vi.fn(),
    };

    service = new PointsService(prisma as never);
  });

  it("同一天重复签到不重复加积分", async () => {
    const wallet = {
      userId: 1n,
      balance: 20,
      totalEarned: 20,
      totalSpent: 0,
      currentStreak: 2,
      longestStreak: 2,
      lastCheckInDate: new Date(Date.UTC(2026, 5, 14)),
    };

    vi.spyOn(pointsUtil, "formatShanghaiDate").mockReturnValue("2026-06-14");
    vi.spyOn(pointsUtil, "toDateText").mockReturnValue("2026-06-14");

    prisma.$transaction = mockTransaction({
      userPointWallet: {
        upsert: vi.fn().mockResolvedValue(wallet),
      },
      dailyCheckIn: {
        create: vi.fn(),
      },
      pointLedger: {
        create: vi.fn(),
      },
    });

    const result = await service.checkIn(1n);

    expect(result.balance).toBe(20);
    expect(result.checkedInToday).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("余额足够时解锁扣分并写入记录", async () => {
    const wallet = {
      userId: 1n,
      balance: 20,
      totalEarned: 20,
      totalSpent: 0,
      currentStreak: 1,
      longestStreak: 1,
      lastCheckInDate: null,
    };

    const txWallet = {
      upsert: vi.fn().mockResolvedValue(wallet),
      update: vi.fn().mockResolvedValue({ ...wallet, balance: 8, totalSpent: 12 }),
    };
    const txUnlock = {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 1n }),
    };
    const txResult = {
      findUnique: vi.fn().mockResolvedValue(null),
    };
    const txLedger = {
      create: vi.fn().mockResolvedValue({ id: 1n }),
    };

    prisma.$transaction = mockTransaction({
      userPointWallet: txWallet,
      levelUnlock: txUnlock,
      levelResult: txResult,
      pointLedger: txLedger,
    });

    const result = await service.unlockLevel(1n, 4n);
    expect(result.canStart).toBe(true);
    expect(result.unlockStatus).toBe("unlocked");
    expect(txWallet.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ balance: 8, totalSpent: 12 }),
      }),
    );
    expect(txUnlock.create).toHaveBeenCalled();
    expect(txLedger.create).toHaveBeenCalled();
  });

  it("余额不足不能解锁", async () => {
    const wallet = {
      userId: 1n,
      balance: 5,
      totalEarned: 5,
      totalSpent: 0,
      currentStreak: 1,
      longestStreak: 1,
      lastCheckInDate: null,
    };

    prisma.$transaction = mockTransaction({
      userPointWallet: {
        upsert: vi.fn().mockResolvedValue(wallet),
      },
      levelUnlock: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      levelResult: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    });

    await expect(service.unlockLevel(1n, 4n)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("已通关关卡可直接开始", async () => {
    prisma.levelResult.findMany = vi.fn().mockResolvedValue([{ levelId: 4n }]);

    const state = await service.getUnlockState(1n, 4n);
    expect(state.unlockStatus).toBe("completed");
    expect(state.canStart).toBe(true);
  });

  it("未解锁关卡 assertLevelStartable 抛 403", async () => {
    await expect(service.assertLevelStartable(1n, 4n)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("通关后积分足够时自动解锁下一关", async () => {
    const wallet = {
      userId: 1n,
      balance: 20,
      totalEarned: 20,
      totalSpent: 0,
      currentStreak: 1,
      longestStreak: 1,
      lastCheckInDate: null,
    };

    prisma.userPointWallet = {
      upsert: vi.fn().mockResolvedValue(wallet),
      update: vi.fn().mockResolvedValue({ ...wallet, balance: 8, totalSpent: 12 }),
    };

    prisma.$transaction = mockTransaction({
      userPointWallet: prisma.userPointWallet,
      levelUnlock: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 1n }),
      },
      levelResult: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      pointLedger: {
        create: vi.fn().mockResolvedValue({ id: 1n }),
      },
    });

    const result = await service.tryAutoUnlockNextLevel(1n, 3n);

    expect(result).not.toBeNull();
    expect(result?.levelId).toBe("4");
    expect(result?.title).toBe("关4");
    expect(result?.autoUnlocked).toBe(true);
    expect(result?.canStart).toBe(true);
  });
});
