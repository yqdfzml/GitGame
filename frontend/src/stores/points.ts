import { defineStore } from "pinia";
import { pointsApi } from "../api/client";
import type { PointWalletSummary } from "../types";

/**
 * 积分钱包 Store。
 * 功能：统一管理积分余额，供顶栏与签到面板共享。
 * 参数：通过 actions 触发拉取或签到。
 * 返回值：响应式 wallet 状态。
 */
export const usePointsStore = defineStore("points", {
  state: () => ({
    /** 当前积分钱包摘要，null 表示尚未加载或加载失败 */
    wallet: null as PointWalletSummary | null,
    /** 是否正在请求钱包 */
    loading: false,
    /** 是否正在签到 */
    checkingIn: false,
  }),

  getters: {
    /** 当前积分余额，未加载时为 null */
    balance: (state) => state.wallet?.balance ?? null,
  },

  actions: {
    /**
     * 拉取最新积分钱包。
     * 功能：从服务端刷新余额与连签状态。
     * 参数：无。
     * 返回值：Promise<PointWalletSummary | null>。
     */
    loadWallet() {
      this.loading = true;
      return pointsApi
        .summary()
        .then((data) => {
          this.wallet = data;
          return data;
        })
        .catch(() => {
          this.wallet = null;
          return null;
        })
        .finally(() => {
          this.loading = false;
        });
    },

    /**
     * 每日签到并在成功后重新拉取钱包。
     * 功能：签到接口返回后再次 summary，保证各页面展示一致。
     * 参数：无。
     * 返回值：Promise<PointWalletSummary | null>。
     */
    checkIn() {
      if (this.checkingIn || this.wallet?.checkedInToday) {
        return Promise.resolve(this.wallet);
      }

      this.checkingIn = true;
      return pointsApi
        .checkIn()
        .then(() => this.loadWallet())
        .finally(() => {
          this.checkingIn = false;
        });
    },

    /**
     * 清空积分状态。
     * 功能：登出时重置，避免展示上一用户数据。
     * 参数：无。
     * 返回值：无。
     */
    clearWallet() {
      this.wallet = null;
      this.loading = false;
      this.checkingIn = false;
    },
  },
});
