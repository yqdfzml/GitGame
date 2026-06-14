<script setup lang="ts">
import { onMounted } from "vue";
import { usePointsStore } from "../stores/points";

const emit = defineEmits<{
  /** 签到成功后通知父组件刷新关卡等数据 */
  checkedIn: [];
}>();

/** 积分钱包 Store */
const pointsStore = usePointsStore();

/**
 * 执行每日签到。
 * 功能：签到成功后重新拉取钱包，并通知父组件刷新。
 * 参数：无。
 * 返回值：无。
 */
const handleCheckIn = () => {
  pointsStore.checkIn().then((wallet) => {
    if (wallet?.checkedInToday) {
      emit("checkedIn");
    }
  });
};

onMounted(() => {
  pointsStore.loadWallet();
});

defineExpose({
  loadWallet: () => pointsStore.loadWallet(),
});
</script>

<template>
  <div class="check-in-panel card">
    <div v-if="pointsStore.loading" class="check-in-loading">加载积分中...</div>

    <template v-else-if="pointsStore.wallet">
      <div class="check-in-main">
        <div class="check-in-balance">
          <span class="check-in-label">当前积分</span>
          <strong class="check-in-value">{{ pointsStore.wallet.balance }}</strong>
        </div>
        <div class="check-in-streak">
          <span class="check-in-label">连签</span>
          <strong class="check-in-value">{{ pointsStore.wallet.currentStreak }} 天</strong>
        </div>
      </div>

      <div class="check-in-actions">
        <button
          class="btn-primary"
          :disabled="pointsStore.wallet.checkedInToday || pointsStore.checkingIn"
          @click="handleCheckIn"
        >
          {{
            pointsStore.wallet.checkedInToday
              ? "今日已签到"
              : pointsStore.checkingIn
                ? "签到中..."
                : "每日签到"
          }}
        </button>
        <span v-if="pointsStore.wallet.checkedInToday" class="check-in-tip">
          明天继续签到可累积连签奖励
        </span>
      </div>
    </template>

    <p v-if="!pointsStore.loading && !pointsStore.wallet" class="error-msg">
      积分加载失败，请刷新页面重试
    </p>
  </div>
</template>
