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
</script>

<template>
  <div>
    <h1 class="page-title">排行榜</h1>
    <p class="page-desc">按得分和耗时排名</p>

    <p v-if="loading">加载中...</p>
    <p v-if="error" class="error-msg">{{ error }}</p>

    <div v-if="!loading && !error" class="card">
      <table class="table">
        <thead>
          <tr>
            <th>排名</th>
            <th>玩家</th>
            <th>关卡</th>
            <th>得分</th>
            <th>耗时(秒)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in entries" :key="`${entry.rank}-${entry.displayName}`">
            <td>{{ entry.rank }}</td>
            <td>{{ entry.displayName }}</td>
            <td>{{ entry.levelId }}</td>
            <td>{{ entry.score }}</td>
            <td>{{ entry.durationSeconds }}</td>
          </tr>
          <tr v-if="entries.length === 0">
            <td colspan="5" style="color:var(--text-muted);text-align:center">暂无记录</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
