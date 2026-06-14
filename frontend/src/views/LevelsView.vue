<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { levelsApi } from "../api/client";
import CheckInPanel from "../components/CheckInPanel.vue";
import LevelChallengeCard from "../components/LevelChallengeCard.vue";
import { usePointsStore } from "../stores/points";
import type { LevelSummary } from "../types";
import {
  getLevelPresentation,
  TOPIC_CHAPTER_IDS,
  type TopicChapterId,
} from "../utils/levelPresentation";

/** 关卡列表 */
const levels = ref<LevelSummary[]>([]);
/** 积分钱包 Store，与签到面板、顶栏共享余额 */
const pointsStore = usePointsStore();
/** 加载中 */
const loading = ref(true);
/** 错误信息 */
const error = ref("");

/**
 * 加载关卡列表。
 * 功能：从后端获取带解锁状态的关卡摘要。
 * 参数：无。
 * 返回值：无。
 */
const loadLevels = () => {
  loading.value = true;
  error.value = "";

  levelsApi
    .list()
    .then((data) => {
      levels.value = data;
    })
    .catch((err: Error) => {
      error.value = err.message;
    })
    .finally(() => {
      loading.value = false;
    });
};

/**
 * 签到成功后刷新页面数据。
 * 功能：重新拉取关卡列表与积分钱包，保证余额展示一致。
 * 参数：无。
 * 返回值：无。
 */
const handleCheckedIn = () => {
  loadLevels();
};

onMounted(loadLevels);

/** 页面展示的积分余额 */
const pointBalance = computed(() => pointsStore.balance);

/**
 * 修炼路径主题卡片数据。
 * 功能：按固定主题顺序聚合关卡与通关进度。
 * 参数：无。
 * 返回值：主题卡片数组。
 */
const topicCards = computed(() => {
  return TOPIC_CHAPTER_IDS.map((chapterId: TopicChapterId) => {
    const presentation = getLevelPresentation(chapterId);
    const chapterLevels = levels.value
      .filter((level) => level.chapterId === chapterId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const completedCount = chapterLevels.filter((level) => level.unlockStatus === "completed").length;
    const totalCount = chapterLevels.length;

    return {
      chapterId,
      presentation,
      levelCount: chapterLevels.length,
      completedCount,
      totalCount,
    };
  });
});

/** 已通关关卡数 */
const completedCount = computed(() =>
  levels.value.filter((level) => level.unlockStatus === "completed").length,
);

/** 全路径通关百分比 */
const routePercent = computed(() => {
  if (levels.value.length === 0) return 0;
  return Math.round((completedCount.value / levels.value.length) * 100);
});
</script>

<template>
  <section class="page-stack levels-page">
    <header class="page-header">
      <h1 class="page-title page-title-serif">修炼路径</h1>
    </header>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner" />
      <span>加载关卡中...</span>
    </div>

    <p v-if="error" class="error-msg">{{ error }}</p>

    <template v-if="!loading && !error">
      <CheckInPanel @checked-in="handleCheckedIn" />

      <div class="levels-strip card">
        <span>{{ completedCount }}/{{ levels.length }} 关已通关</span>
        <span v-if="pointBalance !== null" class="levels-balance">积分 {{ pointBalance }}</span>
        <div class="progress-track levels-strip-track" aria-label="全路径进度">
          <div :style="{ width: `${routePercent}%` }" />
        </div>
        <strong>{{ routePercent }}%</strong>
      </div>

      <div class="topic-lane card">
        <div class="topic-lane-grid">
          <LevelChallengeCard
            v-for="topic in topicCards"
            :key="topic.chapterId"
            :chapter-id="topic.chapterId"
            :presentation="topic.presentation"
            :level-count="topic.levelCount"
            :completed-count="topic.completedCount"
            :total-count="topic.totalCount"
          />
        </div>
      </div>
    </template>
  </section>
</template>
