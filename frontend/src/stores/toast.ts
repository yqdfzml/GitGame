import { defineStore } from "pinia";

/** Toast 类型：成功 / 普通提示 */
export type ToastKind = "success" | "info";

/** 单条 Toast 数据结构 */
export interface ToastItem {
  /** 唯一 id，用于关闭与动画 key */
  id: number;
  /** 展示文案 */
  message: string;
  /** 视觉类型 */
  kind: ToastKind;
  /** 左侧装饰 emoji，有值时替代默认图标 */
  emoji?: string;
}

/** 自增 id，保证每条 Toast 唯一 */
let toastSeq = 0;

/**
 * 全局 Toast Store。
 * 功能：统一管理轻弹窗提示的展示与自动消失。
 * 参数：通过 actions 触发。
 * 返回值：响应式 toasts 列表。
 */
export const useToastStore = defineStore("toast", {
  state: () => ({
    /** 当前展示的 Toast 队列 */
    toasts: [] as ToastItem[],
  }),

  actions: {
    /**
     * 展示一条 Toast。
     * 功能：追加到队列并在指定毫秒后自动移除。
     * 参数：message - 文案；kind - 类型；durationMs - 停留时长；emoji - 可选装饰 emoji。
     * 返回值：新 Toast 的 id。
     */
    show(message: string, kind: ToastKind = "success", durationMs = 3200, emoji?: string) {
      const id = ++toastSeq;
      this.toasts.push({ id, message, kind, emoji });

      window.setTimeout(() => {
        this.dismiss(id);
      }, durationMs);

      return id;
    },

    /**
     * 展示成功类 Toast。
     * 功能：快捷方法，默认绿色成功样式。
     * 参数：message - 文案；emoji - 可选装饰 emoji。
     * 返回值：新 Toast 的 id。
     */
    success(message: string, emoji?: string) {
      return this.show(message, "success", 3200, emoji);
    },

    /**
     * 展示普通提示 Toast。
     * 功能：用于次要正反馈，如解锁下一关。
     * 参数：message - 文案；emoji - 可选装饰 emoji。
     * 返回值：新 Toast 的 id。
     */
    info(message: string, emoji?: string) {
      return this.show(message, "info", 3200, emoji);
    },

    /**
     * 手动关闭指定 Toast。
     * 功能：点击关闭按钮或超时后移除。
     * 参数：id - Toast id。
     * 返回值：无。
     */
    dismiss(id: number) {
      this.toasts = this.toasts.filter((item) => item.id !== id);
    },
  },
});
