import type { CheckInCalendarResponse } from "../types";

/** 日历格数据 */
export interface CheckInCalendarCell {
  date: string | null;
  level: number;
  pointsAwarded: number;
}

/** 月份标签 */
export interface CheckInCalendarMonthLabel {
  weekIndex: number;
  label: string;
}

/** 构建后的日历网格 */
export interface CheckInCalendarGrid {
  weekColumns: CheckInCalendarCell[][];
  monthLabels: CheckInCalendarMonthLabel[];
  totalCheckIns: number;
}

/**
 * 在上海自然日上偏移若干天。
 * 功能：逐日遍历日历范围。
 * 参数：dateText - YYYY-MM-DD；days - 偏移天数。
 * 返回值：偏移后的 YYYY-MM-DD。
 */
function addDays(dateText: string, days: number): string {
  const parts = dateText.split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCDate(utcDate.getUTCDate() + days);
  const nextYear = utcDate.getUTCFullYear();
  const nextMonth = String(utcDate.getUTCMonth() + 1).padStart(2, "0");
  const nextDay = String(utcDate.getUTCDate()).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

/**
 * 计算日期是周几。
 * 功能：0 表示周日，6 表示周六。
 * 参数：dateText - YYYY-MM-DD。
 * 返回值：0-6。
 */
function getDayOfWeek(dateText: string): number {
  const parts = dateText.split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  return utcDate.getUTCDay();
}

/**
 * 计算日期相对起始日的周序号。
 * 功能：列索引从 0 开始。
 * 参数：startDate - 日历起始日；dateText - 当前日期。
 * 返回值：周序号。
 */
function getWeekIndex(startDate: string, dateText: string): number {
  const startParts = startDate.split("-").map(Number);
  const currentParts = dateText.split("-").map(Number);
  const startUtc = Date.UTC(startParts[0], startParts[1] - 1, startParts[2]);
  const currentUtc = Date.UTC(currentParts[0], currentParts[1] - 1, currentParts[2]);
  const diffDays = Math.floor((currentUtc - startUtc) / 86400000);
  return Math.floor(diffDays / 7);
}

/**
 * 根据签到积分映射热力等级。
 * 功能：0 未签到，1-4 对应 GitHub 四档绿色。
 * 参数：pointsAwarded - 当日积分。
 * 返回值：0-4。
 */
function calcHeatLevel(pointsAwarded: number): number {
  if (pointsAwarded <= 0) {
    return 0;
  }
  if (pointsAwarded <= 10) {
    return 1;
  }
  if (pointsAwarded <= 12) {
    return 2;
  }
  if (pointsAwarded <= 18) {
    return 3;
  }
  return 4;
}

/**
 * 格式化月份标签。
 * 功能：日历顶栏展示「1月」「2月」。
 * 参数：dateText - YYYY-MM-DD。
 * 返回值：中文月份标签。
 */
function formatMonthLabel(dateText: string): string {
  const month = Number(dateText.slice(5, 7));
  return `${month}月`;
}

/**
 * 构建 GitHub 风格签到日历网格。
 * 功能：把 API 数据转成按周分列、按星期分行的格子。
 * 参数：data - 签到日历 API 响应。
 * 返回值：CheckInCalendarGrid。
 */
export function buildCheckInCalendarGrid(data: CheckInCalendarResponse): CheckInCalendarGrid {
  const checkInMap = new Map<string, number>();
  for (const item of data.days) {
    checkInMap.set(item.date, item.pointsAwarded);
  }

  const weekCount = getWeekIndex(data.startDate, data.endDate) + 1;
  const rows: CheckInCalendarCell[][] = Array.from({ length: 7 }, () =>
    Array.from({ length: weekCount }, () => ({
      date: null,
      level: 0,
      pointsAwarded: 0,
    })),
  );

  const monthLabels: CheckInCalendarMonthLabel[] = [];
  let lastMonth = "";
  let cursor = data.startDate;

  while (cursor <= data.endDate) {
    const monthKey = cursor.slice(0, 7);
    if (monthKey !== lastMonth) {
      monthLabels.push({
        weekIndex: getWeekIndex(data.startDate, cursor),
        label: formatMonthLabel(cursor),
      });
      lastMonth = monthKey;
    }

    const dayOfWeek = getDayOfWeek(cursor);
    const weekIndex = getWeekIndex(data.startDate, cursor);
    const pointsAwarded = checkInMap.get(cursor) ?? 0;

    rows[dayOfWeek][weekIndex] = {
      date: cursor,
      level: calcHeatLevel(pointsAwarded),
      pointsAwarded,
    };

    cursor = addDays(cursor, 1);
  }

  const weekColumns: CheckInCalendarCell[][] = [];
  for (let weekIndex = 0; weekIndex < weekCount; weekIndex += 1) {
    const column: CheckInCalendarCell[] = [];
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek += 1) {
      column.push(rows[dayOfWeek][weekIndex]);
    }
    weekColumns.push(column);
  }

  return {
    weekColumns,
    monthLabels,
    totalCheckIns: data.days.length,
  };
}

/**
 * 生成日历格 hover 提示文案。
 * 功能：展示日期与签到积分。
 * 参数：cell - 日历格数据。
 * 返回值：title 文案，空格子返回空字符串。
 */
export function formatCheckInCellTitle(cell: CheckInCalendarCell): string {
  if (!cell.date) {
    return "";
  }
  if (cell.pointsAwarded <= 0) {
    return `${cell.date} 未签到`;
  }
  return `${cell.date} 签到 +${cell.pointsAwarded} 积分`;
}
