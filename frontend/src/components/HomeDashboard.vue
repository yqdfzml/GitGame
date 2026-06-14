<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { homeApi, levelsApi, usersApi } from "../api/client";
import ActivityFeedPanel from "./ActivityFeedPanel.vue";
import PracticeCalendar from "./PracticeCalendar.vue";
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
      <div class="home-dashboard-hero">
        <section class="home-main card">
          <div class="home-main-body">
            <div class="home-main-lead">
              <template v-if="nextLevel">
                <p class="home-main-eyebrow">
                  <span v-if="nextPresentation">{{ nextPresentation.chapterLabel }}</span>
                  <span v-if="nextPresentation" class="home-main-eyebrow-sep">·</span>
                  <span :class="canContinue ? 'is-ok' : 'is-warn'">
                    {{ canContinue ? "可继续" : `${nextLevel.unlockCost} 积分` }}
                  </span>
                </p>
                <h2 class="home-main-title">{{ nextLevel.title }}</h2>
                <p v-if="nextPresentation" class="home-main-meta">{{ nextPresentation.skillLabel }}</p>
              </template>

              <template v-else>
                <p class="home-main-eyebrow">
                  <span class="is-ok">主线完成</span>
                </p>
                <h2 class="home-main-title">全部通关</h2>
              </template>
            </div>

            <div class="home-main-progress">
              <div class="home-main-progress-top">
                <span class="home-main-kpi-label">进度</span>
                <span class="home-main-progress-num">{{ routeProgress.percent }}%</span>
              </div>
              <div class="progress-track home-main-progress-track">
                <div :style="{ width: `${routeProgress.percent}%` }" />
              </div>
              <span class="home-main-progress-sub">{{ routeProgress.completed }}/{{ routeProgress.total }}</span>
            </div>

            <div class="home-main-kpis">
              <span class="home-main-kpi">
                <em>积分</em>
                <strong>{{ pointsStore.balance ?? 0 }}</strong>
              </span>
              <span class="home-main-kpi">
                <em>连签</em>
                <strong>{{ pointsStore.wallet?.currentStreak ?? 0 }}<small>天</small></strong>
              </span>
              <RouterLink
                v-if="recentBadges.length > 0"
                to="/achievements"
                class="home-main-kpi home-main-kpi-link"
                :title="recentBadges.map((badge) => badge.name).join('、')"
              >
                <em>成就</em>
                <strong>{{ recentBadges[0].name }}<template v-if="recentBadges.length > 1"> +{{ recentBadges.length - 1 }}</template></strong>
              </RouterLink>
            </div>
          </div>
        </section>

        <PracticeCalendar />
      </div>

      <section class="home-dashboard-secondary">
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
      </section>
    </template>
  </section>
</template>
