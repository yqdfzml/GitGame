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
</script>

<template>
  <section class="page-stack achievements-page">
    <header class="page-header">
      <span class="page-eyebrow">Achievements</span>
      <h1 class="page-title page-title-serif">修炼徽章</h1>
      <p class="page-desc">主线称号、命令专精、结果导向、流派修炼、高阶技法与掌握表现，记录你的 Git 修行之路。</p>
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

      <div
        v-for="section in BADGE_SECTIONS"
        :key="section.category"
        class="achievement-section card"
      >
        <h2 class="achievement-section-title">{{ section.title }}</h2>
        <p class="achievement-section-desc">{{ section.description }}</p>
        <div class="badge-grid">
          <BadgeCard
            v-for="badge in badgesByCategory[section.category]"
            :key="badge.id"
            :badge="badge"
          />
        </div>
      </div>
    </template>
  </section>
</template>
