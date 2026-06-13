<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { levelsApi, usersApi } from "../api/client";
import LevelChallengeCard from "../components/LevelChallengeCard.vue";
import type { LevelSummary } from "../types";
import {
  getLevelPresentation,
  TOPIC_CHAPTER_IDS,
  type TopicChapterId,
} from "../utils/levelPresentation";

/** 关卡列表 */
const levels = ref<LevelSummary[]>([]);
/** 已通关关卡 id 列表 */
const completedLevelIds = ref<string[]>([]);
/** 加载中 */
const loading = ref(true);
/** 错误信息 */
const error = ref("");

onMounted(() => {
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

  usersApi
    .stats()
    .then((stats) => {
      completedLevelIds.value = stats.completedLevelIds;
    })
    .catch(() => {
      completedLevelIds.value = [];
    });
});

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
    const completedCount = chapterLevels.filter((level) =>
      completedLevelIds.value.includes(level.id),
    ).length;
    const totalCount = chapterLevels.length > 0 ? chapterLevels.length : 1;

    return {
      chapterId,
      presentation,
      level: chapterLevels[0],
      completedCount,
      totalCount,
    };
  });
});

/** 已通关关卡数 */
const completedCount = computed(() => completedLevelIds.value.length);

/** 全路径通关百分比 */
const routePercent = computed(() => {
  if (levels.value.length === 0) return 0;
  return Math.round((completedCount.value / levels.value.length) * 100);
});
</script>

<template>
  <section class="page-stack levels-page">
    <header class="page-header">
      <span class="page-eyebrow">关卡</span>
      <h1 class="page-title page-title-serif">修炼路径</h1>
      <p class="page-desc">按主题选择关卡，在终端输入 Git 命令完成目标。系统只检查最终仓库状态。</p>
    </header>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner" />
      <span>加载关卡中...</span>
    </div>

    <p v-if="error" class="error-msg">{{ error }}</p>

    <template v-if="!loading && !error">
      <div class="levels-strip card">
        <span>{{ completedCount }}/{{ levels.length }} 关已通关</span>
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
            :presentation="topic.presentation"
            :level="topic.level"
            :completed-count="topic.completedCount"
            :total-count="topic.totalCount"
          />
        </div>
      </div>
    </template>
  </section>
</template>
