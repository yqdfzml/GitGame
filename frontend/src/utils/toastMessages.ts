/** Toast 文案与装饰 emoji 的打包结构 */
export interface ToastCelebratePayload {
  /** 展示文案（含 inline 特殊字符） */
  message: string;
  /** 左侧大图标 emoji */
  emoji: string;
}

/**
 * 通关成功 Toast 文案。
 * 功能：生成带庆祝字符的通关提示。
 * 参数：score - 本关得分。
 * 返回值：文案与 emoji。
 */
export const levelCompleteToast = (score: number): ToastCelebratePayload => ({
  emoji: "🎉",
  message: `恭喜通关！得分 ${score} 分 ✨`,
});

/**
 * 全部关卡通关 Toast 文案。
 * 功能：主线完成时的最强庆祝反馈。
 * 参数：无。
 * 返回值：文案与 emoji。
 */
export const allLevelsCompleteToast = (): ToastCelebratePayload => ({
  emoji: "🎆",
  message: "太棒了！全部关卡已通关 🏆",
});

/**
 * 徽章解锁 Toast 文案。
 * 功能：新徽章解锁时的正反馈。
 * 参数：count - 新解锁徽章数量。
 * 返回值：文案与 emoji。
 */
export const badgeUnlockToast = (count: number): ToastCelebratePayload => ({
  emoji: "🎖️",
  message: `解锁 ${count} 枚新徽章，去徽章页看看吧 ⭐`,
});

/**
 * 下一关自动解锁 Toast 文案。
 * 功能：通关后自动解锁下一关的提示。
 * 参数：title - 下一关标题。
 * 返回值：文案与 emoji。
 */
export const nextLevelUnlockToast = (title: string): ToastCelebratePayload => ({
  emoji: "✨",
  message: `已解锁下一关「${title}」➡️`,
});

/**
 * 签到成功 Toast 文案。
 * 功能：每日签到完成后的庆祝提示。
 * 参数：pointsAwarded - 本次获得积分；streak - 当前连签天数。
 * 返回值：文案与 emoji。
 */
export const checkInSuccessToast = (pointsAwarded: number, streak: number): ToastCelebratePayload => {
  /** 积分增量文案，无增量时不展示 */
  const pointsText = pointsAwarded > 0 ? `+${pointsAwarded} 积分，` : "";
  /** 连签天数 emoji：7 天以上用 🔥，否则用 ☀️ */
  const streakEmoji = streak >= 7 ? "🔥" : "☀️";

  return {
    emoji: "✅",
    message: `签到成功！${pointsText}连签 ${streak} 天 ${streakEmoji}`,
  };
};

/**
 * 手动解锁关卡 Toast 文案。
 * 功能：消耗积分解锁关卡后的提示。
 * 参数：无。
 * 返回值：文案与 emoji。
 */
export const levelUnlockToast = (): ToastCelebratePayload => ({
  emoji: "🚀",
  message: "关卡解锁成功，可以开始挑战了 💪",
});
