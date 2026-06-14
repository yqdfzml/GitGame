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

      // 最近成就：取最新解锁的 3 个徽章
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
    <header class="home-dashboard-header">
      <div>
        <h2 class="home-section-title">个人仪表盘</h2>
        <p class="home-section-desc">今天该继续哪一关，一眼就能看清。</p>
      </div>
      <RouterLink to="/levels" class="home-section-link">查看学习地图</RouterLink>
    </header>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner" />
      <span>加载仪表盘...</span>
    </div>

    <p v-if="error" class="error-msg">{{ error }}</p>

    <template v-if="!loading && !error">
      <div class="home-dashboard-main">
        <section class="home-hero card">
          <span class="home-hero-label">今日主线</span>

          <template v-if="nextLevel">
            <h3 class="home-hero-title">{{ nextLevel.title }}</h3>
            <p v-if="nextPresentation" class="home-hero-desc">
              {{ nextPresentation.chapterLabel }} · {{ nextPresentation.skillLabel }}
            </p>
            <p class="home-hero-hint">
              {{
                canContinue
                  ? "你已解锁本关，继续推进即可积累积分与徽章。"
                  : `本关尚未解锁，需要 ${nextLevel.unlockCost} 积分。`
              }}
            </p>

            <div class="home-hero-actions">
              <RouterLink
                v-if="canContinue"
                :to="`/practice/${nextLevel.id}`"
                class="btn-primary home-hero-cta"
              >
                继续下一关
              </RouterLink>
              <RouterLink
                v-else-if="nextLevel.chapterId"
                :to="`/levels/${nextLevel.chapterId}`"
                class="btn-primary home-hero-cta"
              >
                去解锁本关
              </RouterLink>
              <RouterLink to="/levels" class="btn-ghost">浏览修炼路径</RouterLink>
            </div>
          </template>

          <template v-else>
            <h3 class="home-hero-title">全部关卡已通关</h3>
            <p class="home-hero-desc">主线修炼完成，可以去成就中心查看徽章，或挑战排行榜。</p>
            <div class="home-hero-actions">
              <RouterLink to="/achievements" class="btn-primary home-hero-cta">查看成就</RouterLink>
              <RouterLink to="/leaderboard" class="btn-ghost">查看排行榜</RouterLink>
            </div>
          </template>
        </section>

        <aside class="home-stats card">
          <div class="home-stat-item">
            <span class="home-stat-label">路径进度</span>
            <strong>{{ routeProgress.completed }}/{{ routeProgress.total }}</strong>
            <div class="progress-track home-stat-track">
              <div :style="{ width: `${routeProgress.percent}%` }" />
            </div>
          </div>

          <div class="home-stat-item">
            <span class="home-stat-label">当前积分</span>
            <strong>{{ pointsStore.balance ?? 0 }}</strong>
          </div>

          <div class="home-stat-item">
            <span class="home-stat-label">连续签到</span>
            <strong>{{ pointsStore.wallet?.currentStreak ?? 0 }} 天</strong>
          </div>

          <div class="home-stat-item">
            <span class="home-stat-label">最近成就</span>
            <ul v-if="recentBadges.length > 0" class="home-recent-badges">
              <li v-for="badge in recentBadges" :key="badge.id">
                <RouterLink to="/achievements">{{ badge.name }}</RouterLink>
              </li>
            </ul>
            <p v-else class="home-stat-empty">通关关卡后可解锁徽章</p>
          </div>
        </aside>
      </div>

      <section class="home-dashboard-secondary">
        <div class="home-dashboard-block">
          <div class="home-dashboard-block-head">
            <h3>全服动态</h3>
          </div>
          <ActivityFeedPanel :activities="activities" :loading="false" :error="''" />
        </div>

        <div class="home-dashboard-block home-dashboard-leaderboard">
          <div class="home-dashboard-block-head">
            <h3>排行榜速览</h3>
            <RouterLink to="/leaderboard" class="home-section-link">完整榜单</RouterLink>
          </div>
          <LeaderboardPanel
            :entries="leaderboard"
            :preview-limit="5"
            :loading="false"
            :error="''"
          />
        </div>
      </section>
    </template>
  </section>
</template>
