<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { adminUsersApi } from "../../api/client";
import AdminListState from "../../components/admin/AdminListState.vue";
import AdminPageHeader from "../../components/admin/AdminPageHeader.vue";
import type { AdminUserListFilters, AdminUserListItem } from "../../types/admin";

const router = useRouter();

/** 用户列表 */
const userList = ref<AdminUserListItem[]>([]);
/** 列表总数 */
const totalCount = ref(0);
/** 筛选与分页条件 */
const filters = ref<AdminUserListFilters>({
  search: "",
  role: "",
  status: "",
  page: 1,
  pageSize: 20,
});
/** 列表加载中 */
const listLoading = ref(true);
/** 列表错误 */
const listError = ref("");

/**
 * 加载用户列表。
 * 功能：按筛选与分页请求后台数据。
 * 参数：无。
 * 返回值：无。
 */
const loadUserList = () => {
  listLoading.value = true;
  listError.value = "";

  adminUsersApi
    .listUsers({
      search: filters.value.search || undefined,
      role: filters.value.role || undefined,
      status: filters.value.status || undefined,
      page: filters.value.page,
      pageSize: filters.value.pageSize,
    })
    .then((result) => {
      userList.value = result.items;
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
 * 跳转到用户详情页。
 * 功能：点击表格行或查看按钮时导航。
 * 参数：userId - 用户 id。
 * 返回值：无。
 */
const goToDetail = (userId: string) => {
  router.push({ name: "admin-user-detail", params: { id: userId } });
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

/** 角色中文映射 */
const roleLabelMap: Record<string, string> = {
  USER: "普通用户",
  ADMIN: "管理员",
};

/** 状态中文映射 */
const statusLabelMap: Record<string, string> = {
  ACTIVE: "正常",
  DISABLED: "已禁用",
};

/** 总页数 */
const totalPages = computed(() => {
  return Math.max(1, Math.ceil(totalCount.value / filters.value.pageSize));
});

/** 列表是否为空 */
const listEmpty = computed(() => userList.value.length === 0);

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
    loadUserList();
  },
  { deep: true },
);

onMounted(() => {
  loadUserList();
});
</script>

<template>
  <section class="admin-users-page">
    <AdminPageHeader title="用户管理" description="查询、筛选运营与测试账号，进入详情处理异常。" />

    <div class="admin-users-toolbar card">
      <label class="admin-filter-label">
        搜索邮箱 / 昵称
        <input
          v-model="filters.search"
          type="search"
          placeholder="输入关键词"
          @keyup.enter="filters.page = 1"
        />
      </label>
      <label class="admin-filter-label">
        角色
        <select v-model="filters.role" class="admin-filter-select" @change="filters.page = 1">
          <option value="">全部角色</option>
          <option value="USER">普通用户</option>
          <option value="ADMIN">管理员</option>
        </select>
      </label>
      <label class="admin-filter-label">
        状态
        <select v-model="filters.status" class="admin-filter-select" @change="filters.page = 1">
          <option value="">全部状态</option>
          <option value="ACTIVE">正常</option>
          <option value="DISABLED">已禁用</option>
        </select>
      </label>
    </div>

    <div class="admin-users-table card">
      <AdminListState
        :loading="listLoading"
        :error="listError"
        :empty="listEmpty"
        empty-text="没有匹配的用户"
      >
        <div class="table-wrap">
          <table class="table admin-users-data-table">
          <thead>
            <tr>
              <th>昵称</th>
              <th>邮箱</th>
              <th>角色</th>
              <th>状态</th>
              <th>最后登录</th>
              <th>注册时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in userList" :key="user.id">
              <td>
                <div class="admin-user-cell">
                  <img v-if="user.avatarUrl" :src="user.avatarUrl" alt="" class="admin-user-avatar" />
                  <span>{{ user.displayName }}</span>
                </div>
              </td>
              <td>{{ user.email }}</td>
              <td>{{ roleLabelMap[user.role] ?? user.role }}</td>
              <td>
                <span class="admin-status-tag" :class="user.status === 'ACTIVE' ? 'ok' : 'warn'">
                  {{ statusLabelMap[user.status] ?? user.status }}
                </span>
              </td>
              <td>{{ formatDateTime(user.lastLoginAt) }}</td>
              <td>{{ formatDateTime(user.createdAt) }}</td>
              <td>
                <button class="btn-ghost admin-table-btn" @click="goToDetail(user.id)">查看</button>
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
