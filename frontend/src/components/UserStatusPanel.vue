<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import CheckInPanel from "./CheckInPanel.vue";
import { usePointsStore } from "../stores/points";
import type { LevelSummary } from "../types";
import { calcRouteProgress, findNextRecommendedLevel, isContinueLevel } from "../utils/levelProgress";
import { getLevelPresentation } from "../utils/levelPresentation";

const props = defineProps<{
  /** 全部关卡，用于计算今日建议 */
  levels: LevelSummary[];
}>();

const emit = defineEmits<{
  /** 签到成功后通知父组件刷新 */
  checkedIn: [];
}>();

/** 积分钱包 Store */
const pointsStore = usePointsStore();

/** 全路径进度统计 */
const routeProgress = computed(() => calcRouteProgress(props.levels));

/** 今日推荐关卡 */
const recommendedLevel = computed(() => findNextRecommendedLevel(props.levels));

/** 推荐关卡展示元数据 */
const recommendedPresentation = computed(() => {
  if (!recommendedLevel.value?.chapterId) {
    return null;
  }
  return getLevelPresentation(recommendedLevel.value.chapterId);
});

/** 推荐关卡是否属于“继续练习” */
const isContinue = computed(() => {
  if (!recommendedLevel.value) {
    return false;
  }
  return isContinueLevel(recommendedLevel.value);
});

/**
 * 签到成功后向上传递事件。
 * 功能：让父页面同步刷新关卡解锁状态。
 * 参数：无。
 * 返回值：无。
 */
const handleCheckedIn = () => {
  emit("checkedIn");
};
</script>

<template>
  <aside class="user-status-panel card">
    <CheckInPanel @checked-in="handleCheckedIn" />

    <div class="user-status-metrics">
      <div class="user-status-metric">
        <span class="user-status-label">进度</span>
        <strong>{{ routeProgress.percent }}%</strong>
        <div class="progress-track user-status-track">
          <div :style="{ width: `${routeProgress.percent}%` }" />
        </div>
      </div>

      <div class="user-status-metric">
        <span class="user-status-label">积分</span>
        <strong>{{ pointsStore.balance ?? 0 }}</strong>
      </div>

      <div class="user-status-metric">
        <span class="user-status-label">连签</span>
        <strong>{{ pointsStore.wallet?.currentStreak ?? 0 }}天</strong>
      </div>
    </div>

    <div v-if="recommendedLevel" class="user-status-next card-inset">
      <div class="user-status-next-head">
        <span v-if="recommendedPresentation" class="ui-chip">{{ recommendedPresentation.chapterLabel }}</span>
        <span class="ui-chip" :class="isContinue ? 'ui-chip-ok' : 'ui-chip-warn'">
          {{ isContinue ? "可开始" : `${recommendedLevel.unlockCost} 积分` }}
        </span>
      </div>
      <strong class="user-status-next-title">{{ recommendedLevel.title }}</strong>
      <RouterLink
        v-if="isContinue"
        :to="`/practice/${recommendedLevel.id}`"
        class="btn-primary user-status-cta"
      >
        开始
      </RouterLink>
      <RouterLink
        v-else-if="recommendedLevel.chapterId"
        :to="`/levels/${recommendedLevel.chapterId}`"
        class="btn-ghost user-status-cta"
      >
        解锁
      </RouterLink>
    </div>
  </aside>
</template>
