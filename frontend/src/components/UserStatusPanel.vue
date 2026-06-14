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
    <h3 class="user-status-title">修行状态</h3>

    <CheckInPanel @checked-in="handleCheckedIn" />

    <div class="user-status-block">
      <span class="user-status-label">全路径进度</span>
      <strong>{{ routeProgress.completed }}/{{ routeProgress.total }} 关</strong>
      <div class="progress-track user-status-track" aria-label="全路径进度">
        <div :style="{ width: `${routeProgress.percent}%` }" />
      </div>
      <span class="user-status-hint">{{ routeProgress.percent }}% 已完成</span>
    </div>

    <div v-if="recommendedLevel" class="user-status-block user-status-suggest">
      <span class="user-status-label">今日建议</span>
      <strong>{{ recommendedLevel.title }}</strong>
      <p v-if="recommendedPresentation" class="user-status-hint">
        {{ recommendedPresentation.chapterLabel }} · {{ recommendedPresentation.skillLabel }}
      </p>
      <p class="user-status-hint">
        {{ isContinue ? "继续推进主线，保持学习节奏" : `解锁需 ${recommendedLevel.unlockCost} 积分` }}
      </p>
      <RouterLink
        v-if="isContinue"
        :to="`/practice/${recommendedLevel.id}`"
        class="btn-primary user-status-cta"
      >
        开始本关
      </RouterLink>
      <RouterLink
        v-else-if="recommendedLevel.chapterId"
        :to="`/levels/${recommendedLevel.chapterId}`"
        class="btn-ghost user-status-cta"
      >
        去章节解锁
      </RouterLink>
    </div>

    <div v-if="pointsStore.wallet && !pointsStore.wallet.checkedInToday" class="user-status-tip card-soft">
      今日尚未签到，签到可获得积分用于解锁后续关卡。
    </div>
  </aside>
</template>
