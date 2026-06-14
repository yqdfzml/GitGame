<script setup lang="ts">
import { onMounted, ref } from "vue";
import { adminDashboardApi } from "../../api/client";
import AdminListState from "../../components/admin/AdminListState.vue";
import AdminPageHeader from "../../components/admin/AdminPageHeader.vue";
import type { AdminDashboardOverview } from "../../types/admin";

/** Dashboard 数据 */
const overview = ref<AdminDashboardOverview | null>(null);
/** 加载中 */
const loading = ref(true);
/** 加载错误 */
const error = ref("");

/**
 * 加载 Dashboard 概览。
 * 功能：请求今日运营指标与待处理事项。
 * 参数：无。
 * 返回值：无。
 */
const loadOverview = () => {
  loading.value = true;
  error.value = "";

  adminDashboardApi
    .getOverview()
    .then((data) => {
      overview.value = data;
    })
    .catch((err: Error) => {
      error.value = err.message;
    })
    .finally(() => {
      loading.value = false;
    });
};

/**
 * 格式化日期时间。
 * 功能：将 ISO 字符串转为本地可读格式。
 * 参数：value - 时间字符串。
 * 返回值：展示文本。
 */
const formatDateTime = (value: string) => {
  return new Date(value).toLocaleString("zh-CN");
};

onMounted(() => {
  loadOverview();
});
</script>

<template>
  <section class="admin-dashboard">
    <AdminPageHeader
      title="总览 Dashboard"
      description="今日运营指标、最近动态与待处理事项。"
    />

    <AdminListState
      :loading="loading"
      :error="error"
      :empty="!overview && !loading && !error"
      empty-text="暂无数据"
    >
      <template v-if="overview">
        <div class="admin-dashboard-grid">
          <article class="admin-dashboard-card card">
            <span class="admin-dashboard-card-label">今日注册</span>
            <strong class="admin-dashboard-card-value">{{ overview.stats.todayRegistrations }}</strong>
          </article>
          <article class="admin-dashboard-card card">
            <span class="admin-dashboard-card-label">活跃用户</span>
            <strong class="admin-dashboard-card-value">{{ overview.stats.activeUsers }}</strong>
          </article>
          <article class="admin-dashboard-card card">
            <span class="admin-dashboard-card-label">通关次数</span>
            <strong class="admin-dashboard-card-value">{{ overview.stats.completionsToday }}</strong>
          </article>
          <article class="admin-dashboard-card card">
            <span class="admin-dashboard-card-label">失败 Attempt</span>
            <strong class="admin-dashboard-card-value">{{ overview.stats.failedAttemptsToday }}</strong>
          </article>
        </div>

        <div class="admin-dashboard-panels">
          <section class="admin-dashboard-section card">
            <h3>待处理事项</h3>
            <p>未发布关卡：{{ overview.pending.draftLevelCount }} 个</p>
            <ul v-if="overview.pending.highAbandonLevels.length > 0" class="admin-dashboard-pending">
              <li
                v-for="level in overview.pending.highAbandonLevels"
                :key="level.levelId"
              >
                高放弃率：{{ level.levelTitle }}（{{ level.abandonedCount }} 次放弃）
              </li>
            </ul>
            <p v-else class="admin-user-empty-hint">暂无高放弃率关卡</p>
          </section>

          <section class="admin-dashboard-section card">
            <h3>最近通关</h3>
            <ul v-if="overview.recentClears.length > 0" class="admin-dashboard-activity">
              <li v-for="item in overview.recentClears" :key="item.id">
                {{ item.displayName }} 通关「{{ item.levelTitle }}」得分 {{ item.score }}
                <span>{{ formatDateTime(item.happenedAt) }}</span>
              </li>
            </ul>
            <p v-else class="admin-user-empty-hint">暂无通关动态</p>
          </section>

          <section class="admin-dashboard-section card">
            <h3>最近徽章解锁</h3>
            <ul v-if="overview.recentBadgeUnlocks.length > 0" class="admin-dashboard-activity">
              <li v-for="item in overview.recentBadgeUnlocks" :key="item.id">
                {{ item.displayName }} 解锁「{{ item.badgeName }}」
                <span>{{ formatDateTime(item.happenedAt) }}</span>
              </li>
            </ul>
            <p v-else class="admin-user-empty-hint">暂无徽章动态</p>
          </section>
        </div>
      </template>
    </AdminListState>
  </section>
</template>
