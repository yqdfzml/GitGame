<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { levelsApi, usersApi } from "../api/client";
import LevelChallengeCard from "../components/LevelChallengeCard.vue";
import type { LevelSummary, RecentLevelResult } from "../types";
import {
  getLevelPresentation,
  TOPIC_CHAPTER_IDS,
  type TopicChapterId,
} from "../utils/levelPresentation";

/** 关卡列表 */
const levels = ref<LevelSummary[]>([]);
/** 最近通关记录 */
const recentPassedLevels = ref<RecentLevelResult[]>([]);
/** 加载中 */
const loading = ref(true);
/** 错误信息 */
const error = ref("");

/**
 * 加载关卡列表与最近通关。
 * 功能：并行拉取章节卡片数据和小字展示区所需的通关记录。
 * 参数：无。
 * 返回值：无。
 */
const loadLevels = () => {
  loading.value = true;
  error.value = "";

  Promise.all([
    levelsApi.list(),
    usersApi.stats(),
  ])
    .then(([levelList, stats]) => {
      levels.value = levelList;
      recentPassedLevels.value = stats.recentResults;
    })
    .catch((err: Error) => {
      error.value = err.message;
    })
    .finally(() => {
      loading.value = false;
    });
};

onMounted(loadLevels);

/** 章节卡片数据 */
const mapNodes = computed(() => {
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
</script>

<template>
  <section class="page-stack levels-page">
    <header class="page-header">
      <h1 class="page-title page-title-serif">学习地图</h1>
    </header>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner" />
      <span>加载关卡中...</span>
    </div>

    <p v-if="error" class="error-msg">{{ error }}</p>

    <section v-if="!loading && !error" class="learning-map-main card">
      <div class="learning-map-recent">
        <span class="learning-map-recent-label">最近通过</span>
        <ul v-if="recentPassedLevels.length > 0" class="learning-map-recent-list">
          <li v-for="item in recentPassedLevels" :key="item.levelId">
            <RouterLink :to="`/practice/${item.levelId}`">{{ item.title }}</RouterLink>
          </li>
        </ul>
        <span v-else class="learning-map-recent-empty">暂无通关记录</span>
      </div>

      <div class="topic-lane-grid learning-map-cards">
        <LevelChallengeCard
          v-for="node in mapNodes"
          :key="node.chapterId"
          :chapter-id="node.chapterId"
          :presentation="node.presentation"
          :level-count="node.levelCount"
          :completed-count="node.completedCount"
          :total-count="node.totalCount"
        />
      </div>
    </section>
  </section>
</template>
