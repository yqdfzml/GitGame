<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { Trophy } from "lucide-vue-next";
import type { LeaderboardEntry } from "../types";

const props = defineProps<{
  /** 外部传入的排行榜数据 */
  entries: LeaderboardEntry[];
  /** 首页预览时只展示前几名，完整页传 0 表示不限制 */
  previewLimit?: number;
  /** 是否加载中 */
  loading: boolean;
  /** 错误信息 */
  error: string;
  /** 面板标题 */
  title?: string;
  /** 是否显示面板头部 */
  showHeader?: boolean;
  /** 头部右侧更多链接 */
  moreHref?: string;
  /** 更多链接文案 */
  moreLabel?: string;
}>();

/** 当前应展示的排行榜条目 */
const visibleEntries = computed(() => {
  if (!props.previewLimit || props.previewLimit <= 0) {
    return props.entries;
  }
  return props.entries.slice(0, props.previewLimit);
});

/**
 * 获取名次展示样式。
 * 功能：前三名使用金银铜阶梯样式。
 * 参数：rank - 排名数字。
 * 返回值：CSS class 名。
 */
const rankPosClass = (rank: number) => {
  if (rank === 1) return "rank-ladder-pos gold";
  if (rank === 2) return "rank-ladder-pos silver";
  if (rank === 3) return "rank-ladder-pos bronze";
  return "rank-ladder-pos";
};

/**
 * 展示关卡名称。
 * 功能：优先显示关卡标题，缺失时回退到 id。
 * 参数：entry - 排行榜条目。
 * 返回值：展示文案。
 */
const levelLabel = (entry: LeaderboardEntry) => {
  if (entry.levelTitle) {
    return entry.levelTitle;
  }
  return `#${entry.levelId}`;
};

/**
 * 格式化耗时展示。
 * 功能：把秒数转成易读时长。
 * 参数：seconds - 耗时秒数。
 * 返回值：展示字符串。
 */
const formatDuration = (seconds: number) => {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainSeconds = seconds % 60;
  return `${minutes}m ${remainSeconds}s`;
};
</script>

<template>
  <div class="rank-ladder-panel">
    <header v-if="showHeader !== false" class="rank-ladder-head">
      <div class="rank-ladder-head-icon">
        <Trophy aria-hidden="true" />
      </div>
      <div class="rank-ladder-head-text">
        <h3 class="rank-ladder-title">{{ title ?? "修行榜" }}</h3>
        <span class="rank-ladder-subtitle">全服最高分 · 最快通关</span>
      </div>
      <RouterLink v-if="moreHref" :to="moreHref" class="rank-ladder-more">{{ moreLabel ?? "全部" }}</RouterLink>
    </header>

    <div v-if="loading" class="loading-state rank-ladder-loading">
      <div class="loading-spinner" />
      <span>加载中...</span>
    </div>

    <p v-if="error" class="error-msg">{{ error }}</p>

    <ol v-if="!loading && !error" class="rank-ladder-list">
      <li
        v-for="entry in visibleEntries"
        :key="`${entry.rank}-${entry.displayName}-${entry.levelId}`"
        class="rank-ladder-item"
        :class="{ podium: entry.rank <= 3 }"
      >
        <span :class="rankPosClass(entry.rank)">{{ entry.rank }}</span>

        <div class="rank-ladder-main">
          <strong class="rank-ladder-user">{{ entry.displayName }}</strong>
          <span class="rank-ladder-level">{{ levelLabel(entry) }}</span>
        </div>

        <div class="rank-ladder-metrics">
          <strong class="rank-ladder-score">{{ entry.score }}</strong>
          <span class="rank-ladder-duration">{{ formatDuration(entry.durationSeconds) }}</span>
        </div>
      </li>

      <li v-if="visibleEntries.length === 0" class="rank-ladder-empty">暂无记录</li>
    </ol>
  </div>
</template>
