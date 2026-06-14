<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { homeApi } from "../api/client";
import ActivityFeedPanel from "./ActivityFeedPanel.vue";
import LeaderboardPanel from "./LeaderboardPanel.vue";
import type { HomeActivityItem, LeaderboardEntry } from "../types";

/** 首页排行榜数据 */
const leaderboard = ref<LeaderboardEntry[]>([]);
/** 首页动态数据 */
const activities = ref<HomeActivityItem[]>([]);
/** 加载中 */
const loading = ref(true);
/** 错误信息 */
const error = ref("");

onMounted(() => {
  homeApi
    .overview()
    .then((data) => {
      leaderboard.value = data.leaderboard;
      activities.value = data.activities;
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
  <section class="home-dashboard card">
    <header class="home-dashboard-header">
      <div>
        <span class="page-eyebrow">Live Arena</span>
        <h2 class="home-section-title">修行广场</h2>
        <p class="home-section-desc">实时查看排行榜与全服通关动态。</p>
      </div>
      <span class="home-live-badge">实时播报</span>
    </header>

    <div class="home-dashboard-grid">
      <section class="home-dashboard-block">
        <div class="home-dashboard-block-head">
          <h3>排行榜</h3>
          <RouterLink to="/leaderboard" class="home-section-link">完整榜单</RouterLink>
        </div>
        <LeaderboardPanel
          :entries="leaderboard"
          :preview-limit="8"
          :loading="loading"
          :error="error"
        />
      </section>

      <section class="home-dashboard-block">
        <div class="home-dashboard-block-head">
          <h3>通关动态</h3>
        </div>
        <ActivityFeedPanel
          :activities="activities"
          :loading="loading"
          :error="error"
        />
      </section>
    </div>
  </section>
</template>
