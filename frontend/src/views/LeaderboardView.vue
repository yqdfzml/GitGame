<script setup lang="ts">
import { onMounted, ref } from "vue";
import { leaderboardApi } from "../api/client";
import type { LeaderboardEntry } from "../types";

/** 排行榜数据 */
const entries = ref<LeaderboardEntry[]>([]);
/** 加载中 */
const loading = ref(true);
/** 错误信息 */
const error = ref("");

onMounted(() => {
  leaderboardApi.list()
    .then((data) => {
      entries.value = data;
    })
    .catch((err: Error) => {
      error.value = err.message;
    })
    .finally(() => {
      loading.value = false;
    });
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
</script>

<template>
  <div>
    <header class="page-header">
      <span class="page-eyebrow">Leaderboard</span>
      <h1 class="page-title">排行榜</h1>
      <p class="page-desc">按得分优先、耗时次之排列</p>
    </header>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner" />
      <span>加载中...</span>
    </div>

    <p v-if="error" class="error-msg">{{ error }}</p>

    <div v-if="!loading && !error" class="card">
      <div class="table-wrap">
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
            <tr v-for="entry in entries" :key="`${entry.rank}-${entry.displayName}`">
              <td><span :class="rankClass(entry.rank)">{{ entry.rank }}</span></td>
              <td>{{ entry.displayName }}</td>
              <td class="mono">#{{ entry.levelId }}</td>
              <td class="score-cell">{{ entry.score }}</td>
              <td class="mono">{{ entry.durationSeconds }}s</td>
            </tr>
            <tr v-if="entries.length === 0">
              <td colspan="5" class="empty-hint" style="text-align:center;padding:32px">暂无记录，完成关卡后上榜</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
