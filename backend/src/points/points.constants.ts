import type { Difficulty } from "@prisma/client";

/** 前 N 个已发布关卡免费解锁 */
export const FREE_PUBLISHED_LEVEL_COUNT = 3;

/** 签到基础积分 */
export const CHECK_IN_BASE_POINTS = 10;

/** 连签第 7 天及以后封顶额外积分 */
export const CHECK_IN_STREAK_CAP_EXTRA = 10;

/** 连签第 2-6 天每日额外积分 */
export const CHECK_IN_STREAK_MID_EXTRA = 2;

/** 各难度解锁价格 */
export const UNLOCK_COST_BY_DIFFICULTY: Record<Difficulty, number> = {
  BEGINNER: 8,
  INTERMEDIATE: 12,
  ADVANCED: 18,
};

/** 关卡解锁状态 */
export type LevelUnlockStatus = "free" | "unlocked" | "completed" | "locked";

/** 积分钱包摘要 DTO */
export interface PointWalletResponse {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  currentStreak: number;
  longestStreak: number;
  checkedInToday: boolean;
  lastCheckInDate: string | null;
}

/** 单关解锁状态 DTO */
export interface LevelUnlockState {
  unlockStatus: LevelUnlockStatus;
  unlockCost: number;
  canStart: boolean;
}

/** 单日解题记录，供日历热力图使用 */
export interface PracticeCalendarDay {
  date: string;
  solveCount: number;
}

/** 近一年解题日历 DTO */
export interface PracticeCalendarResponse {
  startDate: string;
  endDate: string;
  days: PracticeCalendarDay[];
}

/** 通关后下一关信息 DTO */
export interface NextLevelAfterComplete {
  levelId: string;
  title: string;
  canStart: boolean;
  autoUnlocked: boolean;
  unlockCost: number;
}
