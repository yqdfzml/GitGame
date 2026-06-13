<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
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
 * 按课程分组关卡列表。
 * 功能：将 flat 列表按 courseId 分组供模板渲染。
 * 参数：无。
 * 返回值：courseId -> 关卡数组 的映射。
 */
const groupedLevels = computed(() => {
  const groups: Record<string, LevelSummary[]> = {};
  for (const level of levels.value) {
    if (!groups[level.courseId]) {
      groups[level.courseId] = [];
    }
    groups[level.courseId].push(level);
  }
  return groups;
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

/**
 * 课程显示名。
 * 功能：将 courseId 转为可读标题。
 * 参数：courseId - 课程 id。
 * 返回值：中文课程名。
 */
const courseLabel = (courseId: string) => {
  if (courseId === "basics") return "基础入门";
  if (courseId === "workflow") return "工作流";
  return courseId;
};
</script>

<template>
  <div>
    <header class="page-header">
      <span class="page-eyebrow">Practice</span>
      <h1 class="page-title">关卡列表</h1>
      <p class="page-desc">选择关卡开始练习。系统只检查最终仓库状态，不限命令路径。</p>
    </header>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner" />
      <span>加载关卡中...</span>
    </div>

    <p v-if="error" class="error-msg">{{ error }}</p>

    <div v-if="!loading && !error">
      <section
        v-for="(courseLevels, courseId) in groupedLevels"
        :key="courseId"
        class="course-section"
      >
        <h2 class="course-section-title">{{ courseLabel(courseId) }}</h2>
        <div class="card-grid">
          <article
            v-for="level in courseLevels"
            :key="level.id"
            class="card card-hover level-card"
          >
            <div class="level-card-header">
              <h3 class="level-card-title">{{ level.title }}</h3>
              <span :class="difficultyClass(level.difficulty)">{{ level.difficulty }}</span>
            </div>
            <p class="level-card-desc">{{ level.description }}</p>
            <div class="level-card-meta">
              <span>{{ level.chapterId }}</span>
            </div>
            <div class="level-card-footer">
              <RouterLink :to="`/practice/${level.id}`" class="btn-primary">开始练习</RouterLink>
            </div>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>
