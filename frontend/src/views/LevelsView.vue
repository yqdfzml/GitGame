<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { levelsApi, usersApi } from "../api/client";
import LevelChallengeCard from "../components/LevelChallengeCard.vue";
import type { LevelSummary } from "../types";
import { getLevelPresentation } from "../utils/levelPresentation";

/** 关卡列表 */
const levels = ref<LevelSummary[]>([]);
/** 已通关关卡数 */
const completedCount = ref(0);
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
      completedCount.value = stats.completedLevelCount;
    })
    .catch(() => {
      completedCount.value = 0;
    });
});

/**
 * 按章节中文名分组关卡。
 * 功能：沿用重构前的「修炼路径」章节布局。
 * 参数：无。
 * 返回值：章节名 -> 关卡数组。
 */
const groupedByChapter = computed(() => {
  const groups: Record<string, LevelSummary[]> = {};
  const sorted = [...levels.value].sort((a, b) => a.sortOrder - b.sortOrder);

  for (const level of sorted) {
    const chapterLabel = getLevelPresentation(level.chapterId).chapterLabel;
    if (!groups[chapterLabel]) {
      groups[chapterLabel] = [];
    }
    groups[chapterLabel].push(level);
  }
  return groups;
});

/** 全路径通关百分比 */
const routePercent = computed(() => {
  if (levels.value.length === 0) return 0;
  return Math.round((completedCount.value / levels.value.length) * 100);
});
</script>

<template>
  <section class="page-stack">
    <header class="page-header">
      <span class="page-eyebrow">关卡</span>
      <h1 class="page-title page-title-serif">修炼路径</h1>
      <p class="page-desc">按章节选择关卡，在终端输入 Git 命令完成目标。系统只检查最终仓库状态。</p>
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

      <div class="chapter-grid">
        <article
          v-for="(chapterLevels, chapterName) in groupedByChapter"
          :key="chapterName"
          class="card challenge-map"
        >
          <header class="chapter-header">
            <div>
              <h2>{{ chapterName }}</h2>
              <p class="chapter-progress">{{ chapterLevels.length }} 关可修炼</p>
            </div>
            <span>{{ chapterLevels.length }} 关</span>
          </header>
          <div class="challenge-list">
            <LevelChallengeCard
              v-for="(level, idx) in chapterLevels"
              :key="level.id"
              :level="level"
              :index="idx + 1"
            />
          </div>
        </article>
      </div>
    </template>
  </section>
</template>
