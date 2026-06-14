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
    usersApi.stats().catch(() => null),
  ])
    .then(([levelList, stats]) => {
      levels.value = levelList;
      recentPassedLevels.value = stats?.recentResults ?? [];
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
/** 展示用的最近通关（最多 3 条） */
const displayRecentLevels = computed(() => recentPassedLevels.value.slice(0, 3));

/**
 * 最近通关条目的左侧标签。
 * 功能：第一条显示「最近」，其余显示「通关」。
 * 参数：index - 条目序号。
 * 返回值：标签文案。
 */
const recentLevelLabel = (index: number) => {
  if (index === 0) {
    return "最近";
  }
  return "通关";
};
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
        <div class="home-main-kpis learning-map-recent-kpis">
          <template v-if="displayRecentLevels.length > 0">
            <RouterLink
              v-for="(item, index) in displayRecentLevels"
              :key="item.levelId"
              :to="`/practice/${item.levelId}`"
              class="home-main-kpi home-main-kpi-link"
            >
              <em>{{ recentLevelLabel(index) }}</em>
              <strong>
                {{ item.title }}
                <template v-if="index === 2 && recentPassedLevels.length > 3"> +{{ recentPassedLevels.length - 3 }}</template>
              </strong>
            </RouterLink>
          </template>
          <span v-else class="home-main-kpi">
            <em>最近通过</em>
            <strong>暂无</strong>
          </span>
        </div>
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
