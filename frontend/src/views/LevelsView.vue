<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { levelsApi } from "../api/client";
import LevelChallengeCard from "../components/LevelChallengeCard.vue";
import type { LevelSummary } from "../types";
import { findNextRecommendedLevel } from "../utils/levelProgress";
import {
  getLevelPresentation,
  TOPIC_CHAPTER_IDS,
  type TopicChapterId,
} from "../utils/levelPresentation";

/** 关卡列表 */
const levels = ref<LevelSummary[]>([]);
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

/** 当前推荐关卡 */
const recommendedLevel = computed(() => findNextRecommendedLevel(levels.value));
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
      <div v-if="recommendedLevel" class="learning-map-banner">
        <strong class="learning-map-banner-title">{{ recommendedLevel.title }}</strong>
        <RouterLink
          v-if="recommendedLevel.canStart && recommendedLevel.unlockStatus !== 'completed'"
          :to="`/practice/${recommendedLevel.id}`"
          class="btn-primary"
        >
          继续
        </RouterLink>
        <RouterLink
          v-else-if="recommendedLevel.chapterId"
          :to="`/levels/${recommendedLevel.chapterId}`"
          class="btn-ghost"
        >
          解锁
        </RouterLink>
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
