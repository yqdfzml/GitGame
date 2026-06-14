<script setup lang="ts">
import { onMounted, ref } from "vue";
import { pointsApi } from "../api/client";
import type { PointWalletSummary } from "../types";

const emit = defineEmits<{
  /** 钱包数据更新后通知父组件刷新余额 */
  updated: [wallet: PointWalletSummary];
}>();

/** 积分钱包摘要 */
const wallet = ref<PointWalletSummary | null>(null);
/** 是否正在加载钱包 */
const loading = ref(true);
/** 是否正在签到 */
const checkingIn = ref(false);
/** 错误提示 */
const error = ref("");

/**
 * 加载积分钱包。
 * 功能：展示余额与连签天数。
 * 参数：无。
 * 返回值：无。
 */
const loadWallet = () => {
  loading.value = true;
  error.value = "";

  pointsApi
    .summary()
    .then((data) => {
      wallet.value = data;
      emit("updated", data);
    })
    .catch((err: Error) => {
      error.value = err.message;
      wallet.value = null;
    })
    .finally(() => {
      loading.value = false;
    });
};

/**
 * 执行每日签到。
 * 功能：调用签到接口并刷新钱包展示。
 * 参数：无。
 * 返回值：无。
 */
const handleCheckIn = () => {
  if (checkingIn.value || wallet.value?.checkedInToday) {
    return;
  }

  checkingIn.value = true;
  error.value = "";

  pointsApi
    .checkIn()
    .then((data) => {
      wallet.value = data;
      emit("updated", data);
    })
    .catch((err: Error) => {
      error.value = err.message;
    })
    .finally(() => {
      checkingIn.value = false;
    });
};

onMounted(loadWallet);

defineExpose({
  loadWallet,
});
</script>

<template>
  <div class="check-in-panel card">
    <div v-if="loading" class="check-in-loading">加载积分中...</div>

    <template v-else-if="wallet">
      <div class="check-in-main">
        <div class="check-in-balance">
          <span class="check-in-label">当前积分</span>
          <strong class="check-in-value">{{ wallet.balance }}</strong>
        </div>
        <div class="check-in-streak">
          <span class="check-in-label">连签</span>
          <strong class="check-in-value">{{ wallet.currentStreak }} 天</strong>
        </div>
      </div>

      <div class="check-in-actions">
        <button
          class="btn-primary"
          :disabled="wallet.checkedInToday || checkingIn"
          @click="handleCheckIn"
        >
          {{ wallet.checkedInToday ? "今日已签到" : checkingIn ? "签到中..." : "每日签到" }}
        </button>
        <span v-if="wallet.checkedInToday" class="check-in-tip">明天继续签到可累积连签奖励</span>
      </div>
    </template>

    <p v-if="error" class="error-msg">{{ error }}</p>
  </div>
</template>
