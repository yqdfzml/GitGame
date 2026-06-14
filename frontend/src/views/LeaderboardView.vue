<script setup lang="ts">
import { onMounted, ref } from "vue";
import { leaderboardApi } from "../api/client";
import LeaderboardPanel from "../components/LeaderboardPanel.vue";
import type { LeaderboardEntry } from "../types";

/** 排行榜数据 */
const entries = ref<LeaderboardEntry[]>([]);
/** 加载中 */
const loading = ref(true);
/** 错误信息 */
const error = ref("");

onMounted(() => {
  leaderboardApi
    .list()
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
  <section class="page-stack">
    <header class="page-header">
      <span class="page-eyebrow">Leaderboard</span>
      <h1 class="page-title">排行榜</h1>
      <p class="page-desc">按得分优先、耗时次之排列</p>
    </header>

    <div class="card">
      <LeaderboardPanel
        :entries="entries"
        :preview-limit="0"
        :loading="loading"
        :error="error"
      />
    </div>
  </section>
</template>
