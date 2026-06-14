<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { adminAttemptsApi } from "../../api/client";
import AdminListState from "../../components/admin/AdminListState.vue";
import AdminPageHeader from "../../components/admin/AdminPageHeader.vue";
import type { AdminAttemptDetail } from "../../types/admin";

const route = useRoute();
const router = useRouter();

/** attempt id，来自路由参数 */
const attemptId = String(route.params.id);
/** attempt 详情 */
const attemptDetail = ref<AdminAttemptDetail | null>(null);
/** 详情加载中 */
const detailLoading = ref(true);
/** 详情错误 */
const detailError = ref("");

/**
 * 加载 attempt 详情。
 * 功能：请求命令序列与每步反馈。
 * 参数：无。
 * 返回值：无。
 */
const loadAttemptDetail = () => {
  detailLoading.value = true;
  detailError.value = "";

  adminAttemptsApi
    .getAttempt(attemptId)
    .then((detail) => {
      attemptDetail.value = detail;
    })
    .catch((err: Error) => {
      detailError.value = err.message;
    })
    .finally(() => {
      detailLoading.value = false;
    });
};

/**
 * 格式化日期时间。
 * 功能：将 ISO 字符串转为本地可读格式。
 * 参数：value - 时间字符串或 null。
 * 返回值：展示文本。
 */
const formatDateTime = (value: string | null) => {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleString("zh-CN");
};

/**
 * 跳转到回放页。
 * 功能：使用现有 replay 页面查看完整时间线。
 * 参数：无。
 * 返回值：无。
 */
const goToReplay = () => {
  router.push({ name: "replay", params: { attemptId } });
};

/**
 * 跳转到用户详情。
 * 功能：从 attempt 详情进入用户管理页。
 * 参数：无。
 * 返回值：无。
 */
const goToUser = () => {
  if (!attemptDetail.value) {
    return;
  }
  router.push({ name: "admin-user-detail", params: { id: attemptDetail.value.user.id } });
};

/**
 * 返回 attempt 列表。
 * 功能：导航回列表页。
 * 参数：无。
 * 返回值：无。
 */
const backToList = () => {
  router.push({ name: "admin-attempts" });
};

/** 状态中文映射 */
const statusLabelMap: Record<string, string> = {
  IN_PROGRESS: "进行中",
  COMPLETED: "已完成",
  ABANDONED: "已放弃",
};

onMounted(() => {
  loadAttemptDetail();
});
</script>

<template>
  <section class="admin-attempt-detail-page">
    <AdminPageHeader title="Attempt 详情" description="查看命令序列、每步反馈，并跳转回放。">
      <template #actions>
        <button class="btn-ghost" @click="backToList">返回列表</button>
        <button class="btn-primary" :disabled="!attemptDetail" @click="goToReplay">打开回放</button>
      </template>
    </AdminPageHeader>

    <AdminListState
      :loading="detailLoading"
      :error="detailError"
      :empty="!attemptDetail && !detailLoading && !detailError"
      empty-text="练习记录不存在"
    >
      <template v-if="attemptDetail">
        <div class="admin-attempt-detail-grid">
          <section class="card admin-user-stats-panel">
            <h3>用户信息</h3>
            <p><strong>{{ attemptDetail.user.displayName }}</strong></p>
            <p>{{ attemptDetail.user.email }}</p>
            <button class="btn-ghost admin-table-btn" @click="goToUser">查看用户</button>
          </section>

          <section class="card admin-user-stats-panel">
            <h3>关卡信息</h3>
            <p><strong>{{ attemptDetail.level.title }}</strong></p>
            <p>{{ attemptDetail.level.chapterId ?? "未分章" }} · {{ attemptDetail.level.difficulty }}</p>
            <p>关卡 ID {{ attemptDetail.level.id }}</p>
          </section>

          <section class="card admin-user-stats-panel">
            <h3>练习摘要</h3>
            <p>状态：{{ statusLabelMap[attemptDetail.status] ?? attemptDetail.status }}</p>
            <p>步数：{{ attemptDetail.stepCount }}</p>
            <p>开始：{{ formatDateTime(attemptDetail.startedAt) }}</p>
            <p>完成：{{ formatDateTime(attemptDetail.completedAt) }}</p>
          </section>
        </div>

        <section class="card admin-user-attempts">
          <h3>命令序列</h3>
          <template v-if="attemptDetail.commands.length > 0">
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th>步数</th>
                    <th>命令</th>
                    <th>结果</th>
                    <th>反馈</th>
                    <th>时间</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="command in attemptDetail.commands" :key="command.stepIndex">
                    <td>{{ command.stepIndex }}</td>
                    <td class="mono">{{ command.command }}</td>
                    <td>
                      <span class="result-tag" :class="command.success ? 'ok' : 'fail'">
                        {{ command.success ? "成功" : "失败" }}
                      </span>
                    </td>
                    <td>{{ command.feedback ?? "—" }}</td>
                    <td>{{ formatDateTime(command.createdAt) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
          <p v-else class="admin-user-empty-hint">暂无命令记录</p>
        </section>
      </template>
    </AdminListState>
  </section>
</template>
