<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { levelsApi } from "../api/client";
import LevelUnlockButton from "../components/LevelUnlockButton.vue";
import { usePointsStore } from "../stores/points";
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
/** 积分钱包 Store */
const pointsStore = usePointsStore();
/** 加载中 */
const loading = ref(true);
/** 错误信息 */
const error = ref("");

/**
 * 加载章节关卡与解锁状态。
 * 功能：过滤当前章节并按 sortOrder 排序。
 * 参数：无。
 * 返回值：无。
 */
const loadChapterLevels = () => {
  loading.value = true;
  error.value = "";

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
};

/**
 * 解锁后刷新页面数据。
 * 功能：重新拉取关卡列表与积分余额。
 * 参数：无。
 * 返回值：无。
 */
const handleRefresh = () => {
  loadChapterLevels();
  pointsStore.loadWallet();
};

/** 解锁按钮使用的当前积分余额 */
const pointBalance = computed(() => pointsStore.balance ?? 0);

onMounted(() => {
  loadChapterLevels();
  pointsStore.loadWallet();
});
</script>

<template>
  <section class="page-stack chapter-levels-page">
    <header class="page-header">
      <RouterLink to="/levels" class="back-link">← 地图</RouterLink>
      <h1 class="page-title page-title-serif">{{ presentation.chapterLabel }}</h1>
    </header>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner" />
      <span>加载关卡中...</span>
    </div>

    <p v-if="error" class="error-msg">{{ error }}</p>

    <section v-if="!loading && !error" class="chapter-levels-main">
      <div v-if="chapterLevels.length === 0" class="card empty-chapter">
        <ChapterIcon aria-hidden="true" class="empty-chapter-icon" />
        <p>{{ presentation.lockedHint }}</p>
      </div>

      <ul v-else class="level-list card">
        <li v-for="(level, index) in chapterLevels" :key="level.id" class="level-list-item">
          <RouterLink
            v-if="level.canStart"
            :to="`/practice/${level.id}`"
            class="level-list-link"
            :class="{ done: level.unlockStatus === 'completed' }"
          >
            <span class="level-list-index">{{ index + 1 }}</span>
            <span class="level-list-body">
              <strong class="level-list-title">{{ level.title }}</strong>
              <span class="level-list-desc">{{ level.description }}</span>
            </span>
            <span class="level-list-meta">
              <span class="level-difficulty">{{ difficultyLabel(level.difficulty) }}</span>
              <span v-if="level.unlockStatus === 'completed'" class="level-done-badge">已完成</span>
              <span v-else class="level-go-badge">开始</span>
            </span>
          </RouterLink>

          <div v-else class="level-list-link level-list-locked">
            <span class="level-list-index">{{ index + 1 }}</span>
            <span class="level-list-body">
              <strong class="level-list-title">{{ level.title }}</strong>
              <span class="level-list-desc">{{ level.description }}</span>
            </span>
            <span class="level-list-meta">
              <span class="level-difficulty">{{ difficultyLabel(level.difficulty) }}</span>
              <span class="ui-chip ui-chip-warn">{{ level.unlockCost }} 积分</span>
              <LevelUnlockButton
                :level-id="level.id"
                :unlock-cost="level.unlockCost"
                :unlock-status="level.unlockStatus"
                :balance="pointBalance"
                @unlocked="handleRefresh"
              />
            </span>
          </div>
        </li>
      </ul>
    </section>
  </section>
</template>
