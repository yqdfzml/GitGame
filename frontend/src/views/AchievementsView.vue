<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { usersApi } from "../api/client";
import BadgeCard from "../components/BadgeCard.vue";
import type { BadgeCategory, BadgeItem, UserBadgesResponse } from "../types";

/** 成就页分区配置 */
const BADGE_SECTIONS: Array<{
  category: BadgeCategory;
  title: string;
  description: string;
}> = [
  {
    category: "title",
    title: "主线称号",
    description: "从初入山门到飞升 Git 仙，共 10 阶修行称号。",
  },
  {
    category: "command",
    title: "命令专精",
    description: "在实战中掌握各类 Git 命令。",
  },
  {
    category: "result",
    title: "结果导向",
    description: "不绑定固定步骤，只看最终仓库状态与修行方式。",
  },
  {
    category: "workflow",
    title: "流派修炼",
    description: "按章节与学习路径推进，掌握 stash、tag、cherry-pick、rebase、debug 等完整工作流。",
  },
  {
    category: "technique",
    title: "高阶技法",
    description: "在通关 attempt 中正确使用进阶命令与参数组合。",
  },
  {
    category: "mastery",
    title: "掌握表现",
    description: "以低失误、高效率、多路径与高分表现证明 Git 功底。",
  },
];

/** 徽章页数据 */
const badgeData = ref<UserBadgesResponse | null>(null);
/** 当前选中的分类 tab */
const activeCategory = ref<BadgeCategory>("title");
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

/**
 * 按分类分组徽章列表。
 * 功能：供成就页分区渲染使用。
 * 参数：无（读取 badgeData）。
 * 返回值：category -> BadgeItem[] 映射。
 */
const badgesByCategory = computed(() => {
  const grouped: Record<BadgeCategory, BadgeItem[]> = {
    title: [],
    command: [],
    result: [],
    workflow: [],
    technique: [],
    mastery: [],
  };

  if (!badgeData.value) {
    return grouped;
  }

  for (const badge of badgeData.value.badges) {
    grouped[badge.category].push(badge);
  }

  return grouped;
});

/** 下一称号徽章 */
const nextTitleBadge = computed(() => {
  const titleBadges = badgesByCategory.value.title;
  return titleBadges.find((badge) => !badge.unlocked) ?? null;
});

/** 称号体系整体进度百分比 */
const titleProgressPercent = computed(() => {
  const titleBadges = badgesByCategory.value.title;
  if (titleBadges.length === 0) {
    return 0;
  }
  const unlockedCount = titleBadges.filter((badge) => badge.unlocked).length;
  return Math.round((unlockedCount / titleBadges.length) * 100);
});

/** 即将解锁 / 推荐追踪的徽章 */
const trackBadges = computed(() => {
  if (!badgeData.value) {
    return [];
  }

  const lockedBadges = badgeData.value.badges.filter((badge) => !badge.unlocked);
  const result: BadgeItem[] = [];

  if (nextTitleBadge.value) {
    result.push(nextTitleBadge.value);
  }

  for (const badge of lockedBadges) {
    if (result.some((item) => item.id === badge.id)) {
      continue;
    }
    result.push(badge);
    if (result.length >= 4) {
      break;
    }
  }

  return result;
});

/** 当前 tab 对应分区配置 */
const activeSection = computed(() => {
  return BADGE_SECTIONS.find((section) => section.category === activeCategory.value) ?? BADGE_SECTIONS[0];
});

/**
 * 切换成就分类 tab。
 * 功能：避免长页面堆叠，按分类查看徽章。
 * 参数：category - 目标分类。
 * 返回值：无。
 */
const switchCategory = (category: BadgeCategory) => {
  activeCategory.value = category;
};
</script>

<template>
  <section class="page-stack achievements-page">
    <header class="page-header">
      <h1 class="page-title page-title-serif">成就中心</h1>
      <p class="page-desc">先看称号体系与下一目标，再按分类追踪全部徽章。</p>
    </header>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner" />
      <span>加载徽章中...</span>
    </div>

    <p v-if="error" class="error-msg">{{ error }}</p>

    <template v-if="!loading && !error && badgeData">
      <section class="achievements-hero card">
        <div class="achievements-hero-main">
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

          <div class="achievements-title-block">
            <span class="achievements-label">下一称号</span>
            <strong
              v-if="nextTitleBadge"
              class="achievements-next-title"
              :style="{ color: nextTitleBadge.color }"
            >
              {{ nextTitleBadge.name }}
            </strong>
            <strong v-else class="achievements-next-title muted">称号已满级</strong>
            <p v-if="nextTitleBadge" class="achievements-next-desc">{{ nextTitleBadge.description }}</p>
          </div>
        </div>

        <div class="achievements-hero-side">
          <div class="achievements-rank-block">
            <span class="achievements-label">段位</span>
            <strong>{{ badgeData.rank.name }}</strong>
          </div>
          <div class="achievements-progress-block">
            <span class="achievements-label">徽章进度</span>
            <strong>{{ badgeData.unlockedCount }}/{{ badgeData.totalCount }}</strong>
          </div>
          <div class="achievements-progress-block">
            <span class="achievements-label">称号进度</span>
            <strong>{{ titleProgressPercent }}%</strong>
            <div class="progress-track achievements-title-track">
              <div :style="{ width: `${titleProgressPercent}%` }" />
            </div>
          </div>
        </div>
      </section>

      <section v-if="trackBadges.length > 0" class="achievements-track card">
        <h2 class="achievement-section-title">即将解锁 / 推荐追踪</h2>
        <p class="achievement-section-desc">优先关注这些目标，能更快提升称号与段位。</p>
        <div class="badge-grid achievements-track-grid">
          <BadgeCard v-for="badge in trackBadges" :key="badge.id" :badge="badge" />
        </div>
      </section>

      <section class="achievements-catalog card">
        <div class="achievements-tabs" role="tablist" aria-label="成就分类">
          <button
            v-for="section in BADGE_SECTIONS"
            :key="section.category"
            class="achievements-tab"
            :class="{ active: activeCategory === section.category }"
            role="tab"
            :aria-selected="activeCategory === section.category"
            @click="switchCategory(section.category)"
          >
            {{ section.title }}
          </button>
        </div>

        <div class="achievements-tab-panel" role="tabpanel">
          <h2 class="achievement-section-title">{{ activeSection.title }}</h2>
          <p class="achievement-section-desc">{{ activeSection.description }}</p>
          <div class="badge-grid">
            <BadgeCard
              v-for="badge in badgesByCategory[activeCategory]"
              :key="badge.id"
              :badge="badge"
            />
          </div>
        </div>
      </section>
    </template>
  </section>
</template>
