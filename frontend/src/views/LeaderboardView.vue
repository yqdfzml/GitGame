<script setup lang="ts">
import LeaderboardPanel from "../components/LeaderboardPanel.vue";
</script>

<template>
  <section class="page-stack">
    <header class="page-header">
      <span class="page-eyebrow">Leaderboard</span>
      <h1 class="page-title">排行榜</h1>
      <p class="page-desc">按得分优先、耗时次之排列</p>
    </header>

    <div class="card">
      <LeaderboardPanel />
    </div>
  </section>
</template>
