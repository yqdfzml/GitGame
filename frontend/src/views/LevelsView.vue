<script setup lang="ts">
import { onMounted, ref } from "vue";
import { levelsApi } from "../api/client";
import type { LevelSummary } from "../types";

/** 关卡列表 */
const levels = ref<LevelSummary[]>([]);
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
});

/**
 * 难度 badge 样式类名。
 * 功能：根据难度返回 CSS class。
 * 参数：difficulty - 难度枚举字符串。
 * 返回值：CSS class 名。
 */
const difficultyClass = (difficulty: string) => {
  return `badge badge-${difficulty.toLowerCase()}`;
};
</script>

<template>
  <div>
    <h1 class="page-title">关卡列表</h1>
    <p class="page-desc">选择关卡开始练习，按最终仓库状态判题，不限命令路径。</p>

    <p v-if="loading">加载中...</p>
    <p v-if="error" class="error-msg">{{ error }}</p>

    <div v-if="!loading && !error" class="card-grid">
      <div v-for="level in levels" :key="level.id" class="card">
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px">
          <h3>{{ level.title }}</h3>
          <span :class="difficultyClass(level.difficulty)">{{ level.difficulty }}</span>
        </div>
        <p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:12px">{{ level.description }}</p>
        <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:12px">
          {{ level.courseId }} / {{ level.chapterId }}
        </p>
        <RouterLink :to="`/practice/${level.id}`" class="btn-primary">开始练习</RouterLink>
      </div>
    </div>
  </div>
</template>
