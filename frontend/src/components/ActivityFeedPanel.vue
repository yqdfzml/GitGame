<script setup lang="ts">
import { computed } from "vue";
import { ScrollText } from "lucide-vue-next";
import type { HomeActivityItem } from "../types";

const props = defineProps<{
  /** 动态列表 */
  activities: HomeActivityItem[];
  /** 是否加载中 */
  loading: boolean;
  /** 错误信息 */
  error: string;
  /** 是否显示流式头部 */
  showHeader?: boolean;
}>();

/** 去重后的动态列表，首页只展示最近条目 */
const visibleActivities = computed(() => {
  return props.activities.slice(0, 12);
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
    return "now";
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
 * 获取动态圆点样式。
 * 功能：通关与徽章解锁使用不同颜色。
 * 参数：type - 动态类型。
 * 返回值：CSS class 名。
 */
const activityDotClass = (type: HomeActivityItem["type"]) => {
  if (type === "badge_unlock") {
    return "log-stream-dot accent";
  }
  return "log-stream-dot";
};

/**
 * 获取动态状态徽章样式。
 * 功能：为日志流条目提供状态标签颜色。
 * 参数：type - 动态类型。
 * 返回值：CSS class 名。
 */
const activityBadgeClass = (type: HomeActivityItem["type"]) => {
  if (type === "badge_unlock") {
    return "log-stream-status accent";
  }
  return "log-stream-status";
};

/**
 * 获取动态状态标签文案。
 * 功能：区分通关与徽章解锁。
 * 参数：type - 动态类型。
 * 返回值：标签文字。
 */
const activityStatusLabel = (type: HomeActivityItem["type"]) => {
  if (type === "badge_unlock") {
    return "BADGE";
  }
  return "CLEARED";
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
</script>

<template>
  <div class="log-stream-panel activity-log">
    <header v-if="showHeader !== false" class="log-stream-head">
      <div class="log-stream-title">
        <ScrollText class="log-stream-icon" aria-hidden="true" />
        <h3>宗门动态</h3>
      </div>
      <span class="log-stream-live">Live</span>
    </header>

    <div v-if="loading" class="loading-state log-stream-loading">
      <div class="loading-spinner" />
      <span>加载中...</span>
    </div>

    <p v-else-if="error" class="error-msg">{{ error }}</p>

    <ul v-else class="log-stream-list">
      <li
        v-for="item in visibleActivities"
        :key="item.id"
        class="log-stream-item"
      >
        <span :class="activityDotClass(item.type)" />

        <div class="log-stream-body">
          <p class="log-stream-event">
            <template v-if="item.type === 'badge_unlock'">
              解锁
              <em class="log-highlight-badge">{{ item.badgeName }}</em>
            </template>
            <template v-else>
              通关
              <em class="log-highlight-level">{{ item.levelTitle }}</em>
              <template v-if="item.score !== null">
                · 得分
                <em class="log-highlight-score">{{ item.score }}</em>
              </template>
            </template>
          </p>

          <div class="log-stream-user-row">
            <span class="log-stream-avatar">{{ userInitial(item.displayName) }}</span>
            <span class="log-stream-user">{{ item.displayName }}</span>
            <span :class="activityBadgeClass(item.type)">{{ activityStatusLabel(item.type) }}</span>
          </div>
        </div>

        <span class="log-stream-time">{{ formatRelativeTime(item.happenedAt) }}</span>
      </li>

      <li v-if="visibleActivities.length === 0" class="log-stream-empty">—</li>
    </ul>
  </div>
</template>
