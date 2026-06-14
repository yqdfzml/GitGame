import { describe, expect, it } from "vitest";
import {
  calcCheckInPoints,
  calcNextStreakDay,
  calcUnlockCost,
  getPreviousShanghaiDate,
  isFreePublishedLevel,
} from "../src/points/points.util";

describe("calcCheckInPoints", () => {
  it("第 1 天仅基础 10 分", () => {
    expect(calcCheckInPoints(1)).toBe(10);
  });

  it("第 2-6 天额外 +2", () => {
    expect(calcCheckInPoints(2)).toBe(12);
    expect(calcCheckInPoints(6)).toBe(12);
  });

  it("第 7 天及以后封顶额外 +10", () => {
    expect(calcCheckInPoints(7)).toBe(20);
    expect(calcCheckInPoints(10)).toBe(20);
  });
});

describe("calcNextStreakDay", () => {
  it("首次签到 streak 为 1", () => {
    expect(calcNextStreakDay(null, "2026-06-14", 0)).toBe(1);
  });

  it("连续签到 streak +1", () => {
    const today = "2026-06-14";
    const yesterday = getPreviousShanghaiDate(today);
    expect(calcNextStreakDay(yesterday, today, 3)).toBe(4);
  });

  it("断签后 streak 重置为 1", () => {
    expect(calcNextStreakDay("2026-06-10", "2026-06-14", 5)).toBe(1);
  });
});

describe("calcUnlockCost", () => {
  it("前 3 关强制 0 分", () => {
    expect(calcUnlockCost("BEGINNER", 0)).toBe(0);
    expect(calcUnlockCost("ADVANCED", 2)).toBe(0);
  });

  it("第 4 关起按难度定价", () => {
    expect(calcUnlockCost("BEGINNER", 3)).toBe(8);
    expect(calcUnlockCost("INTERMEDIATE", 3)).toBe(12);
    expect(calcUnlockCost("ADVANCED", 3)).toBe(18);
  });
});

describe("isFreePublishedLevel", () => {
  it("仅前 3 关免费", () => {
    expect(isFreePublishedLevel(0)).toBe(true);
    expect(isFreePublishedLevel(2)).toBe(true);
    expect(isFreePublishedLevel(3)).toBe(false);
  });
});

describe("addShanghaiDays", () => {
  it("可向前向后偏移自然日", async () => {
    const { addShanghaiDays, getSundayOnOrBefore } = await import("../src/points/points.util");
    expect(addShanghaiDays("2026-06-14", -1)).toBe("2026-06-13");
    expect(addShanghaiDays("2026-06-14", 1)).toBe("2026-06-15");
    expect(getSundayOnOrBefore("2026-06-14")).toBe("2026-06-08");
  });
});
