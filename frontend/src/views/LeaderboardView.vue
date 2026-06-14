<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
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
  <section class="page-stack leaderboard-page">
    <header class="page-header page-header-compact">
      <h1 class="page-title page-title-serif">排行榜</h1>
      <RouterLink to="/" class="home-section-link">返回</RouterLink>
    </header>

    <div class="card leaderboard-page-card">
      <LeaderboardPanel
        :entries="entries"
        :preview-limit="0"
        :loading="loading"
        :error="error"
        title="修行榜"
      />
    </div>
  </section>
</template>
