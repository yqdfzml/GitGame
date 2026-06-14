<script setup lang="ts">
import { computed } from "vue";
import type { HomeActivityItem } from "../types";

const props = defineProps<{
  /** 动态列表 */
  activities: HomeActivityItem[];
  /** 是否加载中 */
  loading: boolean;
  /** 错误信息 */
  error: string;
}>();

/**
 * 滚动播报条目（复制两份，实现无缝循环）。
 * 功能：把原始动态列表拼接成两倍长度，供 CSS 动画循环播放。
 * 参数：无（读取 props.activities）。
 * 返回值：用于滚动的条目数组。
 */
const marqueeItems = computed(() => {
  if (props.activities.length === 0) {
    return [];
  }
  return [...props.activities, ...props.activities];
});

/**
 * 格式化相对时间。
 * 功能：把 ISO 时间转成「刚刚 / 3 分钟前」等文案。
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
    return `${diffMinutes} 分钟前`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} 小时前`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} 天前`;
};

/**
 * 获取动态类型标签文案。
 * 功能：区分通关与徽章解锁。
 * 参数：type - 动态类型。
 * 返回值：标签文字。
 */
const activityTypeLabel = (type: HomeActivityItem["type"]) => {
  if (type === "badge_unlock") {
    return "徽章";
  }
  return "通关";
};
</script>

<template>
  <div class="activity-marquee-bar">
    <span class="activity-marquee-label">
      <span class="activity-marquee-live-dot" />
      通关动态
    </span>

    <div v-if="loading" class="activity-marquee-status">
      <div class="loading-spinner activity-marquee-spinner" />
      <span>加载动态中...</span>
    </div>

    <p v-else-if="error" class="activity-marquee-status activity-marquee-error">{{ error }}</p>

    <div v-else-if="activities.length === 0" class="activity-marquee-status">
      暂无动态
    </div>

    <div v-else class="activity-marquee-viewport">
      <ul class="activity-marquee-track">
        <li
          v-for="(item, index) in marqueeItems"
          :key="`${item.id}-${index}`"
          class="activity-marquee-item"
        >
          <span class="activity-feed-dot" :class="item.type" />
          <strong>{{ item.displayName }}</strong>
          <span class="activity-feed-tag">{{ activityTypeLabel(item.type) }}</span>
          <span class="activity-marquee-message">{{ item.message }}</span>
          <span class="activity-marquee-time">{{ formatRelativeTime(item.happenedAt) }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>
