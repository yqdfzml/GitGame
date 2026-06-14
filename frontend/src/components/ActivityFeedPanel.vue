<script setup lang="ts">
import type { HomeActivityItem } from "../types";

defineProps<{
  /** 动态列表 */
  activities: HomeActivityItem[];
  /** 是否加载中 */
  loading: boolean;
  /** 错误信息 */
  error: string;
}>();

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
  <div class="activity-feed-panel">
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner" />
      <span>加载动态中...</span>
    </div>

    <p v-if="error" class="error-msg">{{ error }}</p>

    <ul v-if="!loading && !error" class="activity-feed-list">
      <li v-for="item in activities" :key="item.id" class="activity-feed-item">
        <span class="activity-feed-dot" :class="item.type" />
        <div class="activity-feed-body">
          <div class="activity-feed-top">
            <strong>{{ item.displayName }}</strong>
            <span class="activity-feed-tag">{{ activityTypeLabel(item.type) }}</span>
            <span class="activity-feed-time">{{ formatRelativeTime(item.happenedAt) }}</span>
          </div>
          <p class="activity-feed-message">{{ item.message }}</p>
        </div>
      </li>
      <li v-if="activities.length === 0" class="activity-feed-empty">
        暂无通关动态，完成关卡后会在这里播报
      </li>
    </ul>
  </div>
</template>
