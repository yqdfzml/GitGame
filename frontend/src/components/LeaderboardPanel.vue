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
            <th>关卡</th>
            <th>得分</th>
            <th>耗时</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in visibleEntries" :key="`${entry.rank}-${entry.displayName}-${entry.levelId}`">
            <td><span :class="rankClass(entry.rank)">{{ entry.rank }}</span></td>
            <td>{{ entry.displayName }}</td>
            <td>{{ levelLabel(entry) }}</td>
            <td class="score-cell">{{ entry.score }}</td>
            <td class="mono">{{ entry.durationSeconds }}s</td>
          </tr>
          <tr v-if="visibleEntries.length === 0">
            <td colspan="5" class="empty-hint" style="text-align:center;padding:32px">
              暂无记录，完成关卡后上榜
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
