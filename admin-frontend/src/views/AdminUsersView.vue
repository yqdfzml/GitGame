<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { adminUsersApi } from "../api/client";
import AdminListState from "../components/admin/AdminListState.vue";
import AdminPageHeader from "../components/admin/AdminPageHeader.vue";
import { useAuthStore } from "../stores/auth";
import type { AdminUserListFilters, AdminUserListItem } from "../types/admin";

const router = useRouter();
const authStore = useAuthStore();

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
/** 操作反馈 */
const message = ref("");
/** 是否错误反馈 */
const isError = ref(false);
/** 是否显示编辑弹窗 */
const editDialogVisible = ref(false);
/** 正在编辑的用户 */
const editingUser = ref<AdminUserListItem | null>(null);
/** 编辑表单 */
const editForm = ref({
  displayName: "",
  email: "",
  status: "ACTIVE" as "ACTIVE" | "DISABLED",
});
/** 保存编辑中 */
const saving = ref(false);
/** 正在删除的用户 id */
const deletingUserId = ref("");

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
 * 功能：点击详情按钮时导航。
 * 参数：userId - 用户 id。
 * 返回值：无。
 */
const goToDetail = (userId: string) => {
  router.push({ name: "user-detail", params: { id: userId } });
};

/**
 * 打开编辑弹窗。
 * 功能：把当前行数据填入表单。
 * 参数：user - 目标用户。
 * 返回值：无。
 */
const openEditDialog = (user: AdminUserListItem) => {
  editingUser.value = user;
  editForm.value = {
    displayName: user.displayName,
    email: user.email,
    status: user.status,
  };
  editDialogVisible.value = true;
  message.value = "";
  isError.value = false;
};

/**
 * 关闭编辑弹窗。
 * 功能：清空编辑状态。
 * 参数：无。
 * 返回值：无。
 */
const closeEditDialog = () => {
  editDialogVisible.value = false;
  editingUser.value = null;
};

/**
 * 保存用户编辑。
 * 功能：提交昵称、邮箱与状态变更。
 * 参数：无。
 * 返回值：无。
 */
const saveUserEdit = () => {
  if (!editingUser.value) {
    return;
  }

  saving.value = true;
  message.value = "";

  adminUsersApi
    .updateUser(editingUser.value.id, {
      displayName: editForm.value.displayName,
      email: editForm.value.email,
      status: editForm.value.status,
    })
    .then(() => {
      message.value = "用户信息已更新";
      isError.value = false;
      closeEditDialog();
      loadUserList();
    })
    .catch((err: Error) => {
      message.value = err.message;
      isError.value = true;
    })
    .finally(() => {
      saving.value = false;
    });
};

/**
 * 删除用户。
 * 功能：二次确认后永久删除账号及关联数据。
 * 参数：user - 目标用户。
 * 返回值：无。
 */
const deleteUser = (user: AdminUserListItem) => {
  if (authStore.user?.id === user.id) {
    message.value = "不能删除当前登录的管理员账号";
    isError.value = true;
    return;
  }

  const confirmed = window.confirm(
    `确认删除用户「${user.displayName}」（${user.email}）？此操作不可恢复，将一并删除其练习记录与积分数据。`,
  );
  if (!confirmed) {
    return;
  }

  deletingUserId.value = user.id;
  message.value = "";

  adminUsersApi
    .deleteUser(user.id)
    .then(() => {
      message.value = `用户「${user.displayName}」已删除`;
      isError.value = false;
      loadUserList();
    })
    .catch((err: Error) => {
      message.value = err.message;
      isError.value = true;
    })
    .finally(() => {
      deletingUserId.value = "";
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
    <AdminPageHeader
      title="用户管理"
      description="查看、筛选、编辑与删除普通用户，管理员账号不在此列出。"
    />

    <p v-if="message" :class="isError ? 'error-msg' : 'success-msg'">{{ message }}</p>

    <div class="admin-users-toolbar card">
      <label class="admin-filter-label">
        邮箱 / 昵称
        <input
          v-model="filters.search"
          type="search"
          placeholder="搜索用户"
          @keyup.enter="filters.page = 1"
        />
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
                <td>
                  <span class="admin-status-tag" :class="user.status === 'ACTIVE' ? 'ok' : 'warn'">
                    {{ statusLabelMap[user.status] ?? user.status }}
                  </span>
                </td>
                <td>{{ formatDateTime(user.lastLoginAt) }}</td>
                <td>{{ formatDateTime(user.createdAt) }}</td>
                <td>
                  <div class="admin-table-actions">
                    <button class="btn-ghost admin-table-btn" @click="goToDetail(user.id)">详情</button>
                    <button class="btn-ghost admin-table-btn" @click="openEditDialog(user)">编辑</button>
                    <button
                      class="btn-ghost admin-table-btn admin-table-btn-danger"
                      :disabled="deletingUserId === user.id"
                      @click="deleteUser(user)"
                    >
                      {{ deletingUserId === user.id ? "删除中..." : "删除" }}
                    </button>
                  </div>
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

    <div v-if="editDialogVisible" class="admin-dialog-overlay" @click.self="closeEditDialog">
      <div class="admin-dialog card">
        <div class="admin-dialog-head">
          <h2>编辑用户</h2>
          <button class="btn-ghost" @click="closeEditDialog">关闭</button>
        </div>

        <div class="admin-form-grid">
          <div class="form-group">
            <label>昵称</label>
            <input v-model="editForm.displayName" type="text" />
          </div>
          <div class="form-group">
            <label>邮箱</label>
            <input v-model="editForm.email" type="email" />
          </div>
          <div class="form-group">
            <label>状态</label>
            <select v-model="editForm.status">
              <option value="ACTIVE">正常</option>
              <option value="DISABLED">已禁用</option>
            </select>
          </div>
        </div>

        <div class="admin-dialog-actions">
          <button class="btn-primary" :disabled="saving" @click="saveUserEdit">
            {{ saving ? "保存中..." : "保存" }}
          </button>
          <button class="btn-ghost" @click="closeEditDialog">取消</button>
        </div>
      </div>
    </div>
  </section>
</template>
