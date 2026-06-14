<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { usersApi } from "../api/client";
import BadgeCard from "../components/BadgeCard.vue";
import type { BadgeItem, UserBadgesResponse } from "../types";

/** 徽章页数据 */
const badgeData = ref<UserBadgesResponse | null>(null);
/** 加载中 */
const loading = ref(true);
/** 错误信息 */
const error = ref("");

onMounted(() => {
  usersApi
    .badges()
    .then((data) => {
      badgeData.value = data;
    })
    .catch((err: Error) => {
      error.value = err.message;
    })
    .finally(() => {
      loading.value = false;
    });
});

/** 主线称号徽章 */
const titleBadges = computed(() => {
  if (!badgeData.value) return [];
  return badgeData.value.badges.filter((item: BadgeItem) => item.category === "title");
});

/** 命令专精徽章 */
const commandBadges = computed(() => {
  if (!badgeData.value) return [];
  return badgeData.value.badges.filter((item: BadgeItem) => item.category === "command");
});

/** 结果导向徽章 */
const resultBadges = computed(() => {
  if (!badgeData.value) return [];
  return badgeData.value.badges.filter((item: BadgeItem) => item.category === "result");
});
</script>

<template>
  <section class="page-stack achievements-page">
    <header class="page-header">
      <span class="page-eyebrow">Achievements</span>
      <h1 class="page-title page-title-serif">修炼徽章</h1>
      <p class="page-desc">主线称号、命令专精与结果导向成就，记录你的 Git 修行之路。</p>
    </header>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner" />
      <span>加载徽章中...</span>
    </div>

    <p v-if="error" class="error-msg">{{ error }}</p>

    <template v-if="!loading && !error && badgeData">
      <div class="achievements-summary card">
        <div class="achievements-title-block">
          <span class="achievements-label">当前称号</span>
          <strong
            v-if="badgeData.activeTitle"
            class="achievements-active-title"
            :style="{ color: badgeData.activeTitle.color }"
          >
            {{ badgeData.activeTitle.name }}
          </strong>
          <strong v-else class="achievements-active-title muted">尚未获得称号</strong>
        </div>
        <div class="achievements-rank-block">
          <span class="achievements-label">段位</span>
          <strong>{{ badgeData.rank.name }}</strong>
          <span class="achievements-rank-en">{{ badgeData.rank.label }}</span>
        </div>
        <div class="achievements-progress-block">
          <span class="achievements-label">徽章进度</span>
          <strong>{{ badgeData.unlockedCount }}/{{ badgeData.totalCount }}</strong>
        </div>
      </div>

      <div class="achievement-section card">
        <h2 class="achievement-section-title">主线称号</h2>
        <p class="achievement-section-desc">从初入山门到飞升 Git 仙，共 10 阶修行称号。</p>
        <div class="badge-grid">
          <BadgeCard v-for="badge in titleBadges" :key="badge.id" :badge="badge" />
        </div>
      </div>

      <div class="achievement-section card">
        <h2 class="achievement-section-title">命令专精</h2>
        <p class="achievement-section-desc">在实战中掌握各类 Git 命令。</p>
        <div class="badge-grid">
          <BadgeCard v-for="badge in commandBadges" :key="badge.id" :badge="badge" />
        </div>
      </div>

      <div class="achievement-section card">
        <h2 class="achievement-section-title">结果导向</h2>
        <p class="achievement-section-desc">不绑定固定步骤，只看最终仓库状态与修行方式。</p>
        <div class="badge-grid">
          <BadgeCard v-for="badge in resultBadges" :key="badge.id" :badge="badge" />
        </div>
      </div>
    </template>
  </section>
</template>
