<script setup lang="ts">
import { computed, ref } from "vue";
import { levelsApi } from "../api/client";
import { useToastStore } from "../stores/toast";
import { levelUnlockToast } from "../utils/toastMessages";
import type { LevelUnlockStatus } from "../types";

const props = defineProps<{
  /** 关卡 id */
  levelId: string;
  /** 解锁所需积分 */
  unlockCost: number;
  /** 关卡解锁状态 */
  unlockStatus: LevelUnlockStatus;
  /** 当前积分余额 */
  balance: number;
}>();

const emit = defineEmits<{
  /** 解锁成功后通知父组件刷新列表 */
  unlocked: [];
}>();

/** 是否正在解锁 */
const unlocking = ref(false);
/** 错误提示 */
const error = ref("");
/** Toast Store，解锁成功正反馈 */
const toastStore = useToastStore();

/** 余额是否足够解锁 */
const canAfford = computed(() => props.balance >= props.unlockCost);

/** 按钮文案 */
const buttonLabel = computed(() => {
  if (props.unlockStatus === "free") {
    return "免费关卡";
  }
  if (unlocking.value) {
    return "解锁中...";
  }
  if (!canAfford.value) {
    return "";
  }
  return `${props.unlockCost} 积分解锁`;
});

/** 解锁还差多少积分，余额足够时为 0 */
const pointsShortfall = computed(() => {
  if (canAfford.value) {
    return 0;
  }
  return props.unlockCost - props.balance;
});

/**
 * 消耗积分解锁关卡。
 * 功能：调用解锁 API 并在成功后通知父组件。
 * 参数：无。
 * 返回值：无。
 */
const handleUnlock = () => {
  if (unlocking.value || !canAfford.value || props.unlockStatus !== "locked") {
    return;
  }

  unlocking.value = true;
  error.value = "";

  levelsApi
    .unlock(props.levelId)
    .then(() => {
      const unlockToast = levelUnlockToast();
      toastStore.success(unlockToast.message, unlockToast.emoji);
      emit("unlocked");
    })
    .catch((err: Error) => {
      error.value = err.message;
    })
    .finally(() => {
      unlocking.value = false;
    });
};
</script>

<template>
  <div class="level-unlock-wrap">
    <button
      v-if="unlockStatus === 'locked' && canAfford"
      type="button"
      class="level-unlock-action"
      :disabled="unlocking"
      @click="handleUnlock"
    >
      {{ buttonLabel }}
    </button>
    <span
      v-else-if="unlockStatus === 'locked' && !canAfford"
      class="level-unlock-shortage"
      :title="`解锁需 ${unlockCost} 积分，当前 ${balance}`"
    >
      还差 {{ pointsShortfall }} 积分
    </span>
    <span v-else-if="unlockStatus === 'free'" class="level-unlock-free">免费</span>
    <p v-if="error" class="error-msg level-unlock-error">{{ error }}</p>
  </div>
</template>
