<script setup lang="ts">
import { computed } from "vue";
import type { LeaderboardEntry } from "../types";

const props = defineProps<{
  /** 外部传入的排行榜数据，首页聚合接口使用 */
  entries: LeaderboardEntry[];
  /** 首页预览时只展示前几名，完整页传 0 表示不限制 */
  previewLimit?: number;
  /** 是否加载中 */
  loading: boolean;
  /** 错误信息 */
  error: string;
}>();

/**
 * 当前应展示的排行榜条目。
 * 功能：首页可限制条数，完整页展示全部。
 * 参数：无（读取 props）。
 * 返回值：过滤后的排行榜数组。
 */
const visibleEntries = computed(() => {
  if (!props.previewLimit || props.previewLimit <= 0) {
    return props.entries;
  }
  return props.entries.slice(0, props.previewLimit);
});

/**
 * 获取玩家名称首字母，用于无头像时的占位。
 * 功能：取 displayName 或 userId 的首字符并大写。
 * 参数：displayName - 展示名；userId - 可选用户 id。
 * 返回值：单字符字符串。
 */
const playerInitial = (displayName: string, userId?: string) => {
  const name = displayName || userId || "?";
  return name.charAt(0).toUpperCase();
};

/**
 * 获取排名徽章样式。
 * 功能：前三名使用金银铜样式。
 * 参数：rank - 排名数字。
 * 返回值：CSS class 名。
 */
const rankClass = (rank: number) => {
  if (rank === 1) return "rank-badge gold";
  if (rank === 2) return "rank-badge silver";
  if (rank === 3) return "rank-badge bronze";
  return "rank-badge";
};
</script>

<template>
  <div class="leaderboard-panel">
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner" />
      <span>加载排行榜中...</span>
    </div>

    <p v-if="error" class="error-msg">{{ error }}</p>

    <div v-if="!loading && !error" class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>排名</th>
            <th>玩家</th>
            <th>做题积分</th>
            <th>通关数</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in visibleEntries" :key="`${entry.rank}-${entry.displayName}-${entry.userId ?? entry.practiceScore}`">
            <td><span :class="rankClass(entry.rank)">{{ entry.rank }}</span></td>
            <td>
              <div class="leaderboard-player">
                <img
                  v-if="entry.avatarUrl"
                  :src="entry.avatarUrl"
                  alt=""
                  class="leaderboard-avatar-img"
                />
                <span v-else class="leaderboard-avatar">{{ playerInitial(entry.displayName, entry.userId) }}</span>
                <span class="leaderboard-name">{{ entry.displayName }}</span>
              </div>
            </td>
            <td class="score-cell">{{ entry.practiceScore }}</td>
            <td class="mono">{{ entry.completedLevels }}</td>
          </tr>
          <tr v-if="visibleEntries.length === 0">
            <td colspan="4" class="empty-hint" style="text-align:center;padding:32px">
              暂无记录
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
