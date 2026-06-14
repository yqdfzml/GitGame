<script setup lang="ts">
import { computed } from "vue";
import { Award, CheckCircle2, Sparkles } from "lucide-vue-next";
import type { HomeActivityItem } from "../types";

const props = defineProps<{
  /** 动态列表 */
  activities: HomeActivityItem[];
  /** 是否加载中 */
  loading: boolean;
  /** 错误信息 */
  error: string;
  /** 是否显示面板头部 */
  showHeader?: boolean;
}>();

/** 首页展示的最近动态 */
const visibleActivities = computed(() => {
  return props.activities.slice(0, 10);
});

/**
 * 格式化相对时间。
 * 功能：把 ISO 时间转成短格式相对时间。
 * 参数：isoTime - ISO 时间字符串。
 * 返回值：相对时间文案。
 */
const formatRelativeTime = (isoTime: string) => {
  const diffMs = Date.now() - new Date(isoTime).getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes <= 0) {
    return "刚刚";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
};

/**
 * 判断是否为徽章解锁动态。
 * 功能：区分时间线样式与图标。
 * 参数：type - 动态类型。
 * 返回值：是否为徽章类事件。
 */
const isBadgeEvent = (type: HomeActivityItem["type"]) => {
  return type === "badge_unlock";
};
</script>

<template>
  <div class="sect-feed-panel">
    <header v-if="showHeader !== false" class="sect-feed-head">
      <div class="sect-feed-head-icon activity">
        <Sparkles aria-hidden="true" />
      </div>
      <div class="sect-feed-head-text">
        <h3 class="sect-feed-title">宗门动态</h3>
        <span class="sect-feed-subtitle">徽章解锁 · 关卡通关</span>
      </div>
      <span class="sect-feed-live">
        <span class="sect-feed-live-dot" />
        实时
      </span>
    </header>

    <div v-if="loading" class="loading-state sect-feed-loading">
      <div class="loading-spinner" />
      <span>加载中...</span>
    </div>

    <p v-else-if="error" class="error-msg">{{ error }}</p>

    <ul v-else class="sect-feed-timeline">
      <li
        v-for="item in visibleActivities"
        :key="item.id"
        class="sect-feed-item"
        :class="isBadgeEvent(item.type) ? 'badge' : 'clear'"
      >
        <div class="sect-feed-rail" />

        <div class="sect-feed-icon-wrap">
          <Award v-if="isBadgeEvent(item.type)" aria-hidden="true" class="sect-feed-icon" />
          <CheckCircle2 v-else aria-hidden="true" class="sect-feed-icon" />
        </div>

        <div class="sect-feed-body">
          <p v-if="isBadgeEvent(item.type)" class="sect-feed-line">
            <strong>{{ item.displayName }}</strong>
            解锁
            <em>{{ item.badgeName }}</em>
          </p>
          <p v-else class="sect-feed-line">
            <strong>{{ item.displayName }}</strong>
            通关
            <em>{{ item.levelTitle }}</em>
            <span v-if="item.score !== null" class="sect-feed-score">+{{ item.score }}</span>
          </p>
          <span class="sect-feed-tag" :class="isBadgeEvent(item.type) ? 'badge' : 'clear'">
            {{ isBadgeEvent(item.type) ? "徽章" : "通关" }}
          </span>
        </div>

        <time class="sect-feed-time">{{ formatRelativeTime(item.happenedAt) }}</time>
      </li>

      <li v-if="visibleActivities.length === 0" class="sect-feed-empty">暂无动态</li>
    </ul>
  </div>
</template>
