<script setup lang="ts">
import AdminPageHeader from "../components/admin/AdminPageHeader.vue";

/** 总览占位数据，后续 P2+ 接入真实统计 API */
const dashboardCards = [
  { label: "今日注册", value: "—", hint: "待接入统计 API" },
  { label: "活跃用户", value: "—", hint: "待接入统计 API" },
  { label: "通关次数", value: "—", hint: "待接入统计 API" },
  { label: "失败 Attempt", value: "—", hint: "待接入统计 API" },
];

/** 待处理事项占位 */
const pendingItems = [
  "未发布关卡统计",
  "异常失败率关卡",
  "低完成率关卡",
];
</script>

<template>
  <section class="admin-dashboard">
    <AdminPageHeader
      title="总览 Dashboard"
      description="运营数据总览与待处理事项，统计 API 将在后续阶段接入。"
    />

    <div class="admin-dashboard-grid">
      <article v-for="card in dashboardCards" :key="card.label" class="admin-dashboard-card card">
        <span class="admin-dashboard-card-label">{{ card.label }}</span>
        <strong class="admin-dashboard-card-value">{{ card.value }}</strong>
        <span class="admin-dashboard-card-hint">{{ card.hint }}</span>
      </article>
    </div>

    <section class="admin-dashboard-section card">
      <h3>待处理事项</h3>
      <ul class="admin-dashboard-pending">
        <li v-for="item in pendingItems" :key="item">{{ item }}</li>
      </ul>
    </section>
  </section>
</template>
