<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { levelsApi } from "../api/client";
import LevelChallengeCard from "../components/LevelChallengeCard.vue";
import UserStatusPanel from "../components/UserStatusPanel.vue";
import { usePointsStore } from "../stores/points";
import type { LevelSummary } from "../types";
import { findNextRecommendedLevel } from "../utils/levelProgress";
import {
  getLevelPresentation,
  TOPIC_CHAPTER_IDS,
  type TopicChapterId,
} from "../utils/levelPresentation";

/** 关卡列表 */
const levels = ref<LevelSummary[]>([]);
/** 积分钱包 Store */
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
 * 签到或解锁后刷新页面数据。
 * 功能：重新拉取关卡列表与积分钱包。
 * 参数：无。
 * 返回值：无。
 */
const handleRefresh = () => {
  loadLevels();
  pointsStore.loadWallet();
};

onMounted(() => {
  loadLevels();
  pointsStore.loadWallet();
});

/** 学习地图节点数据 */
const mapNodes = computed(() => {
  return TOPIC_CHAPTER_IDS.map((chapterId: TopicChapterId, index) => {
    const presentation = getLevelPresentation(chapterId);
    const chapterLevels = levels.value
      .filter((level) => level.chapterId === chapterId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const completedCount = chapterLevels.filter((level) => level.unlockStatus === "completed").length;
    const totalCount = chapterLevels.length;
    const nextLevel = chapterLevels.find((level) => level.unlockStatus !== "completed");
    const isCurrent = nextLevel !== undefined && totalCount > 0;

    return {
      chapterId,
      index,
      presentation,
      levelCount: chapterLevels.length,
      completedCount,
      totalCount,
      nextLevel,
      isCurrent,
      isDone: totalCount > 0 && completedCount >= totalCount,
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
      <p class="page-desc">按章节顺序推进，当前节点与下一关始终可见。</p>
    </header>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner" />
      <span>加载关卡中...</span>
    </div>

    <p v-if="error" class="error-msg">{{ error }}</p>

    <div v-if="!loading && !error" class="learning-map-layout">
      <section class="learning-map-main card">
        <div v-if="recommendedLevel" class="learning-map-banner">
          <span class="learning-map-banner-label">当前推荐</span>
          <strong>{{ recommendedLevel.title }}</strong>
          <RouterLink
            v-if="recommendedLevel.canStart && recommendedLevel.unlockStatus !== 'completed'"
            :to="`/practice/${recommendedLevel.id}`"
            class="btn-primary"
          >
            继续下一关
          </RouterLink>
          <RouterLink
            v-else-if="recommendedLevel.chapterId"
            :to="`/levels/${recommendedLevel.chapterId}`"
            class="btn-ghost"
          >
            查看解锁条件
          </RouterLink>
        </div>

        <ol class="learning-map-route">
          <li
            v-for="node in mapNodes"
            :key="node.chapterId"
            class="learning-map-node"
            :class="{
              current: node.isCurrent && !node.isDone,
              done: node.isDone,
              empty: node.levelCount === 0,
            }"
          >
            <div class="learning-map-node-marker">
              <span class="learning-map-node-index">{{ node.index + 1 }}</span>
            </div>

            <div class="learning-map-node-body">
              <div class="learning-map-node-head">
                <strong>{{ node.presentation.chapterLabel }}</strong>
                <span v-if="node.isDone" class="learning-map-node-badge done">已完成</span>
                <span v-else-if="node.isCurrent" class="learning-map-node-badge current">进行中</span>
                <span v-else-if="node.levelCount === 0" class="learning-map-node-badge locked">开发中</span>
              </div>
              <p class="learning-map-node-desc">{{ node.presentation.topicDesc }}</p>
              <p class="learning-map-node-progress">{{ node.completedCount }}/{{ node.totalCount }} 关</p>

              <div v-if="node.nextLevel" class="learning-map-node-next">
                <span>下一关：{{ node.nextLevel.title }}</span>
                <RouterLink
                  v-if="node.nextLevel.canStart"
                  :to="`/practice/${node.nextLevel.id}`"
                  class="learning-map-node-link"
                >
                  开始
                </RouterLink>
                <RouterLink
                  v-else
                  :to="`/levels/${node.chapterId}`"
                  class="learning-map-node-link"
                >
                  解锁
                </RouterLink>
              </div>

              <RouterLink
                v-if="node.levelCount > 0"
                :to="`/levels/${node.chapterId}`"
                class="learning-map-node-entry"
              >
                进入章节
              </RouterLink>
            </div>
          </li>
        </ol>

        <div class="topic-lane-grid learning-map-cards">
          <LevelChallengeCard
            v-for="node in mapNodes"
            :key="`card-${node.chapterId}`"
            :chapter-id="node.chapterId"
            :presentation="node.presentation"
            :level-count="node.levelCount"
            :completed-count="node.completedCount"
            :total-count="node.totalCount"
          />
        </div>
      </section>

      <UserStatusPanel :levels="levels" @checked-in="handleRefresh" />
    </div>
  </section>
</template>
