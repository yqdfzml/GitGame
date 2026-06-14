import type { Difficulty } from "@prisma/client";
import {
  CHECK_IN_BASE_POINTS,
  CHECK_IN_STREAK_CAP_EXTRA,
  CHECK_IN_STREAK_MID_EXTRA,
  FREE_PUBLISHED_LEVEL_COUNT,
  UNLOCK_COST_BY_DIFFICULTY,
} from "./points.constants";

/** 上海时区标识，用于按自然日计算签到 */
const SHANGHAI_TIME_ZONE = "Asia/Shanghai";

/**
 * 将 Date 格式化为上海自然日字符串。
 * 功能：统一签到与连签的日期边界。
 * 参数：date - 待格式化的时刻。
 * 返回值：YYYY-MM-DD 字符串。
 */
export function formatShanghaiDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SHANGHAI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * 计算指定上海自然日的前一日。
 * 功能：判断连签是否连续。
 * 参数：dateText - YYYY-MM-DD。
 * 返回值：前一日 YYYY-MM-DD。
 */
export function getPreviousShanghaiDate(dateText: string): string {
  const [yearText, monthText, dayText] = dateText.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCDate(utcDate.getUTCDate() - 1);
  return formatShanghaiDate(utcDate);
}

/**
 * 根据连签天数计算本次签到应得积分。
 * 功能：第 1 天仅基础分；第 2-6 天额外 +2；第 7 天起封顶额外 +10。
 * 参数：streakDay - 本次签到对应的连签天数。
 * 返回值：应发放积分。
 */
export function calcCheckInPoints(streakDay: number): number {
  if (streakDay <= 1) {
    return CHECK_IN_BASE_POINTS;
  }
  if (streakDay >= 7) {
    return CHECK_IN_BASE_POINTS + CHECK_IN_STREAK_CAP_EXTRA;
  }
  return CHECK_IN_BASE_POINTS + CHECK_IN_STREAK_MID_EXTRA;
}

/**
 * 计算本次签到后的连签天数。
 * 功能：昨天签过则 streak+1，否则重置为 1。
 * 参数：lastCheckInDate - 钱包记录的最近签到日；today - 当前上海自然日；currentStreak - 当前连签天数。
 * 返回值：新的连签天数。
 */
export function calcNextStreakDay(
  lastCheckInDate: string | null,
  today: string,
  currentStreak: number,
): number {
  if (!lastCheckInDate) {
    return 1;
  }
  const yesterday = getPreviousShanghaiDate(today);
  if (lastCheckInDate === yesterday) {
    return currentStreak + 1;
  }
  return 1;
}

/**
 * 判断已发布关卡是否属于前 3 关免费区。
 * 功能：按 courseId + sortOrder 全局排序后取前 3 关。
 * 参数：publishedIndex - 关卡在已发布列表中的序号（从 0 开始）。
 * 返回值：是否免费。
 */
export function isFreePublishedLevel(publishedIndex: number): boolean {
  return publishedIndex < FREE_PUBLISHED_LEVEL_COUNT;
}

/**
 * 计算关卡解锁所需积分。
 * 功能：前 3 关强制 0 分，其余按难度定价。
 * 参数：difficulty - 关卡难度；publishedIndex - 已发布排序序号。
 * 返回值：解锁价格。
 */
export function calcUnlockCost(difficulty: Difficulty, publishedIndex: number): number {
  if (isFreePublishedLevel(publishedIndex)) {
    return 0;
  }
  return UNLOCK_COST_BY_DIFFICULTY[difficulty];
}

/**
 * 将 Prisma Date 字段转成 YYYY-MM-DD。
 * 功能：钱包 lastCheckInDate 对外展示。
 * 参数：value - 数据库日期。
 * 返回值：日期字符串或 null。
 */
export function toDateText(value: Date | null | undefined): string | null {
  if (!value) {
    return null;
  }
  return formatShanghaiDate(value);
}

/**
 * 将 YYYY-MM-DD 转成 UTC 零点 Date，供 Prisma @db.Date 写入。
 * 功能：避免时区偏移导致日期错位。
 * 参数：dateText - 上海自然日字符串。
 * 返回值：Date 对象。
 */
export function parseDateOnly(dateText: string): Date {
  const [yearText, monthText, dayText] = dateText.split("-");
  return new Date(Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText)));
}
