import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const viewsDir = path.resolve(__dirname, "../src/views");

/** 用户列表页完整源码 */
const adminUsersView = `<script setup lang="ts">
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
    \`确认删除用户「\${user.displayName}」（\${user.email}）？此操作不可恢复，将一并删除其练习记录与积分数据。\`,
  );
  if (!confirmed) {
    return;
  }

  deletingUserId.value = user.id;
  message.value = "";

  adminUsersApi
    .deleteUser(user.id)
    .then(() => {
      message.value = \`用户「\${user.displayName}」已删除\`;
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
`;

/** 用户详情页完整源码 */
const adminUserDetailView = `<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { adminUsersApi } from "../api/client";
import AdminListState from "../components/admin/AdminListState.vue";
import AdminPageHeader from "../components/admin/AdminPageHeader.vue";
import { useAuthStore } from "../stores/auth";
import type { AdminUserDetail } from "../types/admin";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

/** 用户 id，来自路由参数 */
const userId = String(route.params.id);
/** 用户详情 */
const userDetail = ref<AdminUserDetail | null>(null);
/** 详情加载中 */
const detailLoading = ref(true);
/** 详情错误 */
const detailError = ref("");
/** 操作反馈 */
const message = ref("");
/** 是否错误反馈 */
const isError = ref(false);
/** 状态变更中 */
const statusUpdating = ref(false);
/** 撤销会话中 */
const revoking = ref(false);
/** 删除中 */
const deleting = ref(false);

/**
 * 加载用户详情。
 * 功能：请求后台完整用户快照。
 * 参数：无。
 * 返回值：无。
 */
const loadUserDetail = () => {
  detailLoading.value = true;
  detailError.value = "";

  adminUsersApi
    .getUser(userId)
    .then((detail) => {
      if (detail.role === "ADMIN") {
        detailError.value = "管理员账号不在用户管理中";
        userDetail.value = null;
        return;
      }
      userDetail.value = detail;
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
 * 切换用户启用状态。
 * 功能：ACTIVE 与 DISABLED 互切，禁用前二次确认。
 * 参数：无。
 * 返回值：无。
 */
const toggleUserStatus = () => {
  if (!userDetail.value) {
    return;
  }

  const nextStatus = userDetail.value.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
  if (nextStatus === "DISABLED") {
    const confirmed = window.confirm(\`确认禁用用户「\${userDetail.value.displayName}」？禁用后无法登录。\`);
    if (!confirmed) {
      return;
    }
  }

  statusUpdating.value = true;
  message.value = "";

  adminUsersApi
    .updateStatus(userId, nextStatus)
    .then((result) => {
      message.value = nextStatus === "DISABLED" ? "用户已禁用" : "用户已启用";
      isError.value = false;
      if (userDetail.value) {
        userDetail.value.status = result.status;
      }
    })
    .catch((err: Error) => {
      message.value = err.message;
      isError.value = true;
    })
    .finally(() => {
      statusUpdating.value = false;
    });
};

/**
 * 撤销用户全部登录态。
 * 功能：作废 refresh token，强制重新登录。
 * 参数：无。
 * 返回值：无。
 */
const revokeSessions = () => {
  if (!userDetail.value) {
    return;
  }

  const confirmed = window.confirm(\`确认撤销「\${userDetail.value.displayName}」的全部登录态？\`);
  if (!confirmed) {
    return;
  }

  revoking.value = true;
  message.value = "";

  adminUsersApi
    .revokeSessions(userId)
    .then((result) => {
      message.value = \`已撤销 \${result.revokedCount} 个会话\`;
      isError.value = false;
      if (userDetail.value) {
        userDetail.value.activeSessionCount = 0;
      }
    })
    .catch((err: Error) => {
      message.value = err.message;
      isError.value = true;
    })
    .finally(() => {
      revoking.value = false;
    });
};

/**
 * 删除当前用户。
 * 功能：二次确认后永久删除账号。
 * 参数：无。
 * 返回值：无。
 */
const deleteCurrentUser = () => {
  if (!userDetail.value) {
    return;
  }

  if (authStore.user?.id === userDetail.value.id) {
    message.value = "不能删除当前登录的管理员账号";
    isError.value = true;
    return;
  }

  const confirmed = window.confirm(
    \`确认删除用户「\${userDetail.value.displayName}」？此操作不可恢复。\`,
  );
  if (!confirmed) {
    return;
  }

  deleting.value = true;
  message.value = "";

  adminUsersApi
    .deleteUser(userId)
    .then(() => {
      router.push({ name: "users" });
    })
    .catch((err: Error) => {
      message.value = err.message;
      isError.value = true;
    })
    .finally(() => {
      deleting.value = false;
    });
};

/** 玩家端地址 */
const playerBaseUrl = import.meta.env.VITE_PLAYER_URL ?? "http://localhost:5173";

/**
 * 跳转到 attempt 回放页。
 * 功能：从最近练习记录进入现有 replay 页面。
 * 参数：attemptId - attempt id。
 * 返回值：无。
 */
const goToReplay = (attemptId: string) => {
  window.open(\`\${playerBaseUrl}/replay/\${attemptId}\`, "_blank");
};

/**
 * 返回用户列表。
 * 功能：导航回列表页。
 * 参数：无。
 * 返回值：无。
 */
const backToList = () => {
  router.push({ name: "users" });
};

onMounted(() => {
  loadUserDetail();
});
</script>

<template>
  <section class="admin-user-detail-page">
    <AdminPageHeader title="用户详情" description="查看通关进度、积分、徽章与最近练习记录。">
      <template #actions>
        <button class="btn-ghost" @click="backToList">返回列表</button>
      </template>
    </AdminPageHeader>

    <AdminListState
      :loading="detailLoading"
      :error="detailError"
      :empty="!userDetail && !detailLoading && !detailError"
      empty-text="用户不存在"
    >
      <template v-if="userDetail">
        <div class="admin-user-detail-grid">
          <section class="card admin-user-profile">
            <div class="admin-user-profile-head">
              <img
                v-if="userDetail.avatarUrl"
                :src="userDetail.avatarUrl"
                alt=""
                class="admin-user-profile-avatar"
              />
              <div>
                <h3>{{ userDetail.displayName }}</h3>
                <p>{{ userDetail.email }}</p>
                <p class="admin-user-profile-meta">
                  ID {{ userDetail.id }} ·
                  {{ userDetail.status === "ACTIVE" ? "正常" : "已禁用" }}
                </p>
              </div>
            </div>

            <dl class="admin-user-info-list">
              <div><dt>最后登录</dt><dd>{{ formatDateTime(userDetail.lastLoginAt) }}</dd></div>
              <div><dt>注册时间</dt><dd>{{ formatDateTime(userDetail.createdAt) }}</dd></div>
              <div><dt>活跃会话</dt><dd>{{ userDetail.activeSessionCount }}</dd></div>
            </dl>

            <div class="admin-user-detail-actions">
              <button class="btn-ghost" :disabled="statusUpdating" @click="toggleUserStatus">
                {{ statusUpdating ? "处理中..." : userDetail.status === "ACTIVE" ? "禁用用户" : "启用用户" }}
              </button>
              <button class="btn-ghost" :disabled="revoking" @click="revokeSessions">
                {{ revoking ? "撤销中..." : "撤销登录态" }}
              </button>
              <button
                class="btn-ghost admin-table-btn-danger"
                :disabled="deleting"
                @click="deleteCurrentUser"
              >
                {{ deleting ? "删除中..." : "删除用户" }}
              </button>
            </div>

            <p v-if="message" :class="isError ? 'error-msg' : 'success-msg'">{{ message }}</p>
          </section>

          <section class="card admin-user-stats-panel">
            <h3>通关进度</h3>
            <p>已完成 {{ userDetail.stats.completedLevelCount }} 关</p>
            <p>累计得分 {{ userDetail.stats.totalScore }}</p>
            <p v-if="userDetail.stats.activeTitle">
              当前称号：{{ userDetail.stats.activeTitle.name }}
            </p>
            <p>段位：{{ userDetail.stats.rank.label }}</p>
          </section>

          <section class="card admin-user-stats-panel">
            <h3>积分钱包</h3>
            <template v-if="userDetail.wallet">
              <p>余额 {{ userDetail.wallet.balance }}</p>
              <p>累计获得 {{ userDetail.wallet.totalEarned }}</p>
              <p>累计消耗 {{ userDetail.wallet.totalSpent }}</p>
              <p>当前连签 {{ userDetail.wallet.currentStreak }} 天</p>
            </template>
            <p v-else class="admin-user-empty-hint">暂无钱包记录</p>
          </section>

          <section class="card admin-user-stats-panel">
            <h3>徽章</h3>
            <p>已解锁 {{ userDetail.badges.unlockedCount }} / {{ userDetail.badges.totalCount }}</p>
            <ul v-if="userDetail.badges.items.length > 0" class="admin-user-badge-list">
              <li v-for="badge in userDetail.badges.items" :key="badge.id">{{ badge.name }}</li>
            </ul>
            <p v-else class="admin-user-empty-hint">暂无已解锁徽章</p>
          </section>
        </div>

        <section class="card admin-user-attempts">
          <h3>最近 Attempt 记录</h3>
          <template v-if="userDetail.recentAttempts.length > 0">
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th>关卡</th>
                    <th>状态</th>
                    <th>步数</th>
                    <th>开始时间</th>
                    <th>完成时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="attempt in userDetail.recentAttempts" :key="attempt.id">
                    <td>{{ attempt.levelTitle }}</td>
                    <td>{{ attempt.status }}</td>
                    <td>{{ attempt.stepCount }}</td>
                    <td>{{ formatDateTime(attempt.startedAt) }}</td>
                    <td>{{ formatDateTime(attempt.completedAt) }}</td>
                    <td>
                      <button class="btn-ghost admin-table-btn" @click="goToReplay(attempt.id)">回放</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
          <p v-else class="admin-user-empty-hint">暂无练习记录</p>
        </section>
      </template>
    </AdminListState>
  </section>
</template>
`;

/**
 * 以 UTF-8 无 BOM 写入文件。
 * 功能：修复被损坏为 ???? 的中文源码。
 * 参数：filePath - 目标路径；content - 文件内容。
 * 返回值：无。
 */
function writeUtf8File(filePath, content) {
  fs.writeFileSync(filePath, content, { encoding: "utf8" });
}

writeUtf8File(path.join(viewsDir, "AdminUsersView.vue"), adminUsersView);
writeUtf8File(path.join(viewsDir, "AdminUserDetailView.vue"), adminUserDetailView);

console.log("已修复 AdminUsersView.vue 与 AdminUserDetailView.vue 的中文编码");
