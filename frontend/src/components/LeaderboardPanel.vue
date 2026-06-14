<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { ScrollText } from "lucide-vue-next";
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
  /** 是否显示流式头部 */
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
 * 获取排名圆点样式。
 * 功能：前三名使用金银铜色，其余使用默认绿色。
 * 参数：rank - 排名数字。
 * 返回值：CSS class 名。
 */
const rankDotClass = (rank: number) => {
  if (rank === 1) return "log-stream-dot gold";
  if (rank === 2) return "log-stream-dot silver";
  if (rank === 3) return "log-stream-dot bronze";
  return "log-stream-dot";
};

/**
 * 获取排名状态徽章样式。
 * 功能：为日志流条目提供 TOP 标签颜色。
 * 参数：rank - 排名数字。
 * 返回值：CSS class 名。
 */
const rankBadgeClass = (rank: number) => {
  if (rank === 1) return "log-stream-status gold";
  if (rank === 2) return "log-stream-status silver";
  if (rank === 3) return "log-stream-status bronze";
  return "log-stream-status";
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
 * 获取用户名首字母。
 * 功能：用于头像占位圆标。
 * 参数：name - 玩家昵称。
 * 返回值：单字符。
 */
const userInitial = (name: string) => {
  return name.charAt(0).toUpperCase();
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
  <div class="log-stream-panel leaderboard-log">
    <header v-if="showHeader !== false" class="log-stream-head">
      <div class="log-stream-title">
        <ScrollText class="log-stream-icon" aria-hidden="true" />
        <h3>{{ title ?? "修行榜" }}</h3>
      </div>
      <span class="log-stream-live">Live</span>
      <RouterLink v-if="moreHref" :to="moreHref" class="log-stream-more">{{ moreLabel ?? "全部" }}</RouterLink>
    </header>

    <div v-if="loading" class="loading-state log-stream-loading">
      <div class="loading-spinner" />
      <span>加载中...</span>
    </div>

    <p v-if="error" class="error-msg">{{ error }}</p>

    <ul v-if="!loading && !error" class="log-stream-list">
      <li
        v-for="entry in visibleEntries"
        :key="`${entry.rank}-${entry.displayName}-${entry.levelId}`"
        class="log-stream-item"
      >
        <span :class="rankDotClass(entry.rank)" />

        <div class="log-stream-body">
          <p class="log-stream-event">
            通关
            <em class="log-highlight-level">{{ levelLabel(entry) }}</em>
            · 得分
            <em class="log-highlight-score">{{ entry.score }}</em>
          </p>

          <div class="log-stream-user-row">
            <span class="log-stream-avatar">{{ userInitial(entry.displayName) }}</span>
            <span class="log-stream-user">{{ entry.displayName }}</span>
            <span :class="rankBadgeClass(entry.rank)">TOP {{ entry.rank }}</span>
          </div>
        </div>

        <span class="log-stream-time">{{ formatDuration(entry.durationSeconds) }}</span>
      </li>

      <li v-if="visibleEntries.length === 0" class="log-stream-empty">—</li>
    </ul>
  </div>
</template>
