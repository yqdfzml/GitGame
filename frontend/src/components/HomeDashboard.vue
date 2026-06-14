<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { homeApi, levelsApi, usersApi } from "../api/client";
import ActivityFeedPanel from "./ActivityFeedPanel.vue";
import LeaderboardPanel from "./LeaderboardPanel.vue";
import { usePointsStore } from "../stores/points";
import type { BadgeItem, HomeActivityItem, LeaderboardEntry, LevelSummary } from "../types";
import { calcRouteProgress, findNextRecommendedLevel, isContinueLevel } from "../utils/levelProgress";
import { getLevelPresentation } from "../utils/levelPresentation";

/** 全部关卡数据 */
const levels = ref<LevelSummary[]>([]);
/** 首页排行榜数据 */
const leaderboard = ref<LeaderboardEntry[]>([]);
/** 首页动态数据 */
const activities = ref<HomeActivityItem[]>([]);
/** 最近解锁的徽章 */
const recentBadges = ref<BadgeItem[]>([]);
/** 积分钱包 Store */
const pointsStore = usePointsStore();
/** 加载中 */
const loading = ref(true);
/** 错误信息 */
const error = ref("");

/**
 * 加载仪表盘所需数据。
 * 功能：并行拉取关卡、积分、徽章与广场次级数据。
 * 参数：无。
 * 返回值：无。
 */
const loadDashboard = () => {
  loading.value = true;
  error.value = "";

  Promise.all([
    levelsApi.list(),
    usersApi.badges(),
    homeApi.overview(),
    pointsStore.loadWallet(),
  ])
    .then(([levelList, badgeData, overview]) => {
      levels.value = levelList;
      leaderboard.value = overview.leaderboard;
      activities.value = overview.activities;

      recentBadges.value = badgeData.badges
        .filter((badge) => badge.unlocked)
        .sort((left, right) => {
          const leftTime = left.unlockedAt ? new Date(left.unlockedAt).getTime() : 0;
          const rightTime = right.unlockedAt ? new Date(right.unlockedAt).getTime() : 0;
          return rightTime - leftTime;
        })
        .slice(0, 3);
    })
    .catch((err: Error) => {
      error.value = err.message;
    })
    .finally(() => {
      loading.value = false;
    });
};

onMounted(loadDashboard);

/** 全路径进度 */
const routeProgress = computed(() => calcRouteProgress(levels.value));

/** 推荐下一关 */
const nextLevel = computed(() => findNextRecommendedLevel(levels.value));

/** 推荐关卡章节展示信息 */
const nextPresentation = computed(() => {
  if (!nextLevel.value?.chapterId) {
    return null;
  }
  return getLevelPresentation(nextLevel.value.chapterId);
});

/** 主 CTA 是否为继续练习 */
const canContinue = computed(() => {
  if (!nextLevel.value) {
    return false;
  }
  return isContinueLevel(nextLevel.value);
});
</script>

<template>
  <section class="home-dashboard">
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner" />
      <span>加载中...</span>
    </div>

    <p v-if="error" class="error-msg">{{ error }}</p>

    <template v-if="!loading && !error">
      <section class="home-main card">
        <div class="home-main-body">
          <div class="home-main-lead">
            <template v-if="nextLevel">
              <div class="home-main-tags">
                <span v-if="nextPresentation" class="ui-chip ui-chip-muted">{{ nextPresentation.chapterLabel }}</span>
                <span class="ui-chip" :class="canContinue ? 'ui-chip-ok' : 'ui-chip-warn'">
                  {{ canContinue ? "可继续" : `${nextLevel.unlockCost} 积分` }}
                </span>
              </div>

              <div class="home-main-row">
                <div class="home-main-info">
                  <h2 class="home-main-title">{{ nextLevel.title }}</h2>
                  <p v-if="nextPresentation" class="home-main-meta">{{ nextPresentation.skillLabel }}</p>
                </div>

                <div class="home-main-actions">
                  <RouterLink
                    v-if="canContinue"
                    :to="`/practice/${nextLevel.id}`"
                    class="btn-primary home-main-cta"
                  >
                    继续
                  </RouterLink>
                  <RouterLink
                    v-else-if="nextLevel.chapterId"
                    :to="`/levels/${nextLevel.chapterId}`"
                    class="btn-primary home-main-cta"
                  >
                    解锁
                  </RouterLink>
                  <RouterLink to="/levels" class="btn-ghost home-main-map">地图</RouterLink>
                </div>
              </div>
            </template>

            <template v-else>
              <div class="home-main-tags">
                <span class="ui-chip ui-chip-ok">主线完成</span>
              </div>
              <div class="home-main-row">
                <h2 class="home-main-title">全部通关</h2>
                <div class="home-main-actions">
                  <RouterLink to="/achievements" class="btn-primary home-main-cta">成就</RouterLink>
                  <RouterLink to="/leaderboard" class="btn-ghost home-main-map">排行</RouterLink>
                </div>
              </div>
            </template>
          </div>

          <div class="home-main-stats">
            <div class="home-main-stat">
              <span class="home-main-stat-label">进度</span>
              <strong class="home-main-stat-value">{{ routeProgress.percent }}%</strong>
              <div class="progress-track home-main-stat-track">
                <div :style="{ width: `${routeProgress.percent}%` }" />
              </div>
              <span class="home-main-stat-sub">{{ routeProgress.completed }}/{{ routeProgress.total }}</span>
            </div>

            <div class="home-main-stat">
              <span class="home-main-stat-label">积分</span>
              <strong class="home-main-stat-value">{{ pointsStore.balance ?? 0 }}</strong>
            </div>

            <div class="home-main-stat">
              <span class="home-main-stat-label">连签</span>
              <strong class="home-main-stat-value">{{ pointsStore.wallet?.currentStreak ?? 0 }}<small>天</small></strong>
            </div>
          </div>
        </div>

        <div v-if="recentBadges.length > 0" class="home-main-badges">
          <span class="home-main-stat-label">成就</span>
          <ul class="home-recent-badges">
            <li v-for="badge in recentBadges" :key="badge.id">
              <RouterLink to="/achievements" class="ui-chip ui-chip-badge">{{ badge.name }}</RouterLink>
            </li>
          </ul>
        </div>
      </section>

      <ActivityFeedPanel :activities="activities" :loading="false" :error="''" />

      <section class="home-dashboard-block home-dashboard-leaderboard">
        <div class="home-dashboard-block-head">
          <h3>排行榜</h3>
          <RouterLink to="/leaderboard" class="home-section-link">完整榜单</RouterLink>
        </div>
        <LeaderboardPanel
          :entries="leaderboard"
          :preview-limit="8"
          :loading="false"
          :error="''"
        />
      </section>
    </template>
  </section>
</template>
