<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { adminUsersApi } from "../../api/client";
import AdminListState from "../../components/admin/AdminListState.vue";
import AdminPageHeader from "../../components/admin/AdminPageHeader.vue";
import type { AdminUserDetail } from "../../types/admin";

const route = useRoute();
const router = useRouter();

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
/** 角色变更中 */
const roleUpdating = ref(false);
/** 撤销会话中 */
const revoking = ref(false);

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
    const confirmed = window.confirm(`确认禁用用户「${userDetail.value.displayName}」？禁用后无法登录。`);
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
 * 切换用户角色。
 * 功能：USER 与 ADMIN 互切，变更前二次确认。
 * 参数：无。
 * 返回值：无。
 */
const toggleUserRole = () => {
  if (!userDetail.value) {
    return;
  }

  const nextRole = userDetail.value.role === "ADMIN" ? "USER" : "ADMIN";
  const roleText = nextRole === "ADMIN" ? "管理员" : "普通用户";
  const confirmed = window.confirm(`确认将「${userDetail.value.displayName}」调整为${roleText}？`);
  if (!confirmed) {
    return;
  }

  roleUpdating.value = true;
  message.value = "";

  adminUsersApi
    .updateRole(userId, nextRole)
    .then((result) => {
      message.value = `角色已更新为${roleText}`;
      isError.value = false;
      if (userDetail.value) {
        userDetail.value.role = result.role;
      }
    })
    .catch((err: Error) => {
      message.value = err.message;
      isError.value = true;
    })
    .finally(() => {
      roleUpdating.value = false;
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

  const confirmed = window.confirm(`确认撤销「${userDetail.value.displayName}」的全部登录态？`);
  if (!confirmed) {
    return;
  }

  revoking.value = true;
  message.value = "";

  adminUsersApi
    .revokeSessions(userId)
    .then((result) => {
      message.value = `已撤销 ${result.revokedCount} 个会话`;
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
 * 跳转到 attempt 回放页。
 * 功能：从最近练习记录进入现有 replay 页面。
 * 参数：attemptId - attempt id。
 * 返回值：无。
 */
const goToReplay = (attemptId: string) => {
  router.push({ name: "replay", params: { attemptId } });
};

/**
 * 返回用户列表。
 * 功能：导航回列表页。
 * 参数：无。
 * 返回值：无。
 */
const backToList = () => {
  router.push({ name: "admin-users" });
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
                  {{ userDetail.role === "ADMIN" ? "管理员" : "普通用户" }} ·
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
              <button class="btn-ghost" :disabled="roleUpdating" @click="toggleUserRole">
                {{ roleUpdating ? "处理中..." : userDetail.role === "ADMIN" ? "降为普通用户" : "设为管理员" }}
              </button>
              <button class="btn-ghost" :disabled="revoking" @click="revokeSessions">
                {{ revoking ? "撤销中..." : "撤销登录态" }}
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
