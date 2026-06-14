<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { levelsApi, usersApi } from "../api/client";
import type { LevelSummary } from "../types";
import {
  difficultyLabel,
  getLevelPresentation,
  kindIconMap,
} from "../utils/levelPresentation";

const route = useRoute();
/** 当前章节 id */
const chapterId = route.params.chapterId as string;

/** 章节展示元数据 */
const presentation = computed(() => getLevelPresentation(chapterId));
/** 章节图标组件 */
const ChapterIcon = computed(() => kindIconMap[presentation.value.kind]);
/** 本章节关卡列表 */
const chapterLevels = ref<LevelSummary[]>([]);
/** 已通关关卡 id */
const completedLevelIds = ref<string[]>([]);
/** 加载中 */
const loading = ref(true);
/** 错误信息 */
const error = ref("");

onMounted(() => {
  levelsApi
    .list()
    .then((data) => {
      chapterLevels.value = data
        .filter((level) => level.chapterId === chapterId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
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
 * 判断关卡是否已通关。
 * 功能：根据用户通关记录标记完成状态。
 * 参数：levelId - 关卡 id。
 * 返回值：是否已通关。
 */
const isLevelDone = (levelId: string): boolean => completedLevelIds.value.includes(levelId);
</script>

<template>
  <section class="page-stack chapter-levels-page">
    <header class="page-header">
      <RouterLink to="/levels" class="back-link">← 修炼路径</RouterLink>
      <h1 class="page-title page-title-serif">{{ presentation.chapterLabel }}</h1>
    </header>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner" />
      <span>加载关卡中...</span>
    </div>

    <p v-if="error" class="error-msg">{{ error }}</p>

    <div v-if="!loading && !error && chapterLevels.length === 0" class="card empty-chapter">
      <ChapterIcon aria-hidden="true" class="empty-chapter-icon" />
      <p>{{ presentation.lockedHint }}</p>
    </div>

    <ul v-if="!loading && !error && chapterLevels.length > 0" class="level-list card">
      <li v-for="(level, index) in chapterLevels" :key="level.id" class="level-list-item">
        <RouterLink
          :to="`/practice/${level.id}`"
          class="level-list-link"
          :class="{ done: isLevelDone(level.id) }"
        >
          <span class="level-list-index">{{ index + 1 }}</span>
          <span class="level-list-body">
            <strong class="level-list-title">{{ level.title }}</strong>
            <span class="level-list-desc">{{ level.description }}</span>
          </span>
          <span class="level-list-meta">
            <span class="level-difficulty">{{ difficultyLabel(level.difficulty) }}</span>
            <span v-if="isLevelDone(level.id)" class="level-done-badge">已完成</span>
            <span v-else class="level-go-badge">开始</span>
          </span>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>
