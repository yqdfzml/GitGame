<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { adminAttemptsApi } from "../api/client";
import AdminListState from "../components/admin/AdminListState.vue";
import AdminPageHeader from "../components/admin/AdminPageHeader.vue";
import type { AdminAttemptListFilters, AdminAttemptListItem } from "../types/admin";
import { getChapterLabel } from "@shared/utils/levelPresentation";

const route = useRoute();
const router = useRouter();

/** attempt 列表 */
const attemptList = ref<AdminAttemptListItem[]>([]);
/** 列表总数 */
const totalCount = ref(0);
/** 筛选与分页条件 */
const filters = ref<AdminAttemptListFilters>({
  search: "",
  levelId: "",
  userId: String(route.query.userId ?? ""),
  status: "",
  page: 1,
  pageSize: 20,
});
/** 列表加载中 */
const listLoading = ref(true);
/** 列表错误 */
const listError = ref("");

/**
 * 加载 attempt 列表。
 * 功能：按筛选与分页请求后台数据。
 * 参数：无。
 * 返回值：无。
 */
const loadAttemptList = () => {
  listLoading.value = true;
  listError.value = "";

  adminAttemptsApi
    .listAttempts({
      search: filters.value.search || undefined,
      levelId: filters.value.levelId || undefined,
      userId: filters.value.userId || undefined,
      status: filters.value.status || undefined,
      page: filters.value.page,
      pageSize: filters.value.pageSize,
    })
    .then((result) => {
      attemptList.value = result.items;
      totalCount.value = result.total;
    })
    .catch((err: Error) => {
      listError.value = err.message;
    })
    .finally(() => {
      listLoading.value = false;
    });
};

/**
 * 跳转到 attempt 详情页。
 * 功能：点击行或查看按钮时导航。
 * 参数：attemptId - attempt id。
 * 返回值：无。
 */
const goToDetail = (attemptId: string) => {
  router.push({ name: "attempt-detail", params: { id: attemptId } });
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

/** 状态中文映射 */
const statusLabelMap: Record<string, string> = {
  IN_PROGRESS: "进行中",
  COMPLETED: "已完成",
  ABANDONED: "已放弃",
};

/** 总页数 */
const totalPages = computed(() => {
  return Math.max(1, Math.ceil(totalCount.value / filters.value.pageSize));
});

/** 列表是否为空 */
const listEmpty = computed(() => attemptList.value.length === 0);

/**
 * 翻到上一页。
 * 功能：页码减 1 并重新加载。
 * 参数：无。
 * 返回值：无。
 */
const goPrevPage = () => {
  if (filters.value.page <= 1) {
    return;
  }
  filters.value.page -= 1;
};

/**
 * 翻到下一页。
 * 功能：页码加 1 并重新加载。
 * 参数：无。
 * 返回值：无。
 */
const goNextPage = () => {
  if (filters.value.page >= totalPages.value) {
    return;
  }
  filters.value.page += 1;
};

watch(
  filters,
  () => {
    loadAttemptList();
  },
  { deep: true },
);

onMounted(() => {
  loadAttemptList();
});
</script>

<template>
  <section class="admin-attempts-page">
    <AdminPageHeader
      title="学习记录"
      description="排查高失败命令与卡点关卡，支持跳转回放。"
    />

    <div class="admin-users-toolbar card">
      <label class="admin-filter-label">
        搜索用户
        <input v-model="filters.search" type="search" placeholder="邮箱或昵称" />
      </label>
      <label class="admin-filter-label">
        关卡 ID
        <input v-model="filters.levelId" type="text" placeholder="可选" />
      </label>
      <label class="admin-filter-label">
        用户 ID
        <input v-model="filters.userId" type="text" placeholder="可选" />
      </label>
      <label class="admin-filter-label">
        状态
        <select v-model="filters.status" class="admin-filter-select" @change="filters.page = 1">
          <option value="">全部状态</option>
          <option value="IN_PROGRESS">进行中</option>
          <option value="COMPLETED">已完成</option>
          <option value="ABANDONED">已放弃</option>
        </select>
      </label>
    </div>

    <div class="admin-users-table card">
      <AdminListState
        :loading="listLoading"
        :error="listError"
        :empty="listEmpty"
        empty-text="没有匹配的练习记录"
      >
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>用户</th>
                <th>关卡</th>
                <th>状态</th>
                <th>步数</th>
                <th>开始时间</th>
                <th>完成时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="attempt in attemptList" :key="attempt.id">
                <td>
                  <strong>{{ attempt.userDisplayName }}</strong>
                  <span class="admin-attempt-sub">{{ attempt.userEmail }}</span>
                </td>
                <td>
                  <strong>{{ attempt.levelTitle }}</strong>
                  <span class="admin-attempt-sub">{{ getChapterLabel(attempt.levelChapterId) }}</span>
                </td>
                <td>{{ statusLabelMap[attempt.status] ?? attempt.status }}</td>
                <td>{{ attempt.stepCount }}</td>
                <td>{{ formatDateTime(attempt.startedAt) }}</td>
                <td>{{ formatDateTime(attempt.completedAt) }}</td>
                <td>
                  <button class="btn-ghost admin-table-btn" @click="goToDetail(attempt.id)">查看</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </AdminListState>

      <div class="admin-table-footer">
        <span>共 {{ totalCount }} 条，第 {{ filters.page }} / {{ totalPages }} 页</span>
        <div class="admin-table-pagination">
          <button class="btn-ghost" :disabled="filters.page <= 1" @click="goPrevPage">上一页</button>
          <button class="btn-ghost" :disabled="filters.page >= totalPages" @click="goNextPage">下一页</button>
        </div>
      </div>
    </div>
  </section>
</template>
