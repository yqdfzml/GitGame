<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { adminUsersApi } from "../api/client";
import AdminListState from "../components/admin/AdminListState.vue";
import AdminPageHeader from "../components/admin/AdminPageHeader.vue";
import type { AdminUserDetail } from "../types/admin";

const route = useRoute();
const router = useRouter();

/** ?? id??????? */
const userId = String(route.params.id);
/** ???? */
const userDetail = ref<AdminUserDetail | null>(null);
/** ????? */
const detailLoading = ref(true);
/** ???? */
const detailError = ref("");
/** ???? */
const message = ref("");
/** ?????? */
const isError = ref(false);
/** ????? */
const statusUpdating = ref(false);
/** ????? */
const roleUpdating = ref(false);
/** ????? */
const revoking = ref(false);
/** ????? */
const playerBaseUrl = import.meta.env.VITE_PLAYER_URL ?? "http://localhost:5173";

/**
 * ???????
 * ??????????????
 * ?????
 * ??????
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
 * ????????
 * ???? ISO ????????????
 * ???value - ?????? null?
 * ?????????
 */
const formatDateTime = (value: string | null) => {
  if (!value) {
    return "?";
  }
  return new Date(value).toLocaleString("zh-CN");
};

/**
 * ?????????
 * ???ACTIVE ? DISABLED ???????????
 * ?????
 * ??????
 */
const toggleUserStatus = () => {
  if (!userDetail.value) {
    return;
  }

  const nextStatus = userDetail.value.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
  if (nextStatus === "DISABLED") {
    const confirmed = window.confirm(`???????${userDetail.value.displayName}??????????`);
    if (!confirmed) {
      return;
    }
  }

  statusUpdating.value = true;
  message.value = "";

  adminUsersApi
    .updateStatus(userId, nextStatus)
    .then((result) => {
      message.value = nextStatus === "DISABLED" ? "?????" : "?????";
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
 * ???????
 * ???USER ? ADMIN ???????????
 * ?????
 * ??????
 */
const toggleUserRole = () => {
  if (!userDetail.value) {
    return;
  }

  const nextRole = userDetail.value.role === "ADMIN" ? "USER" : "ADMIN";
  const roleText = nextRole === "ADMIN" ? "???" : "????";
  const confirmed = window.confirm(`????${userDetail.value.displayName}????${roleText}?`);
  if (!confirmed) {
    return;
  }

  roleUpdating.value = true;
  message.value = "";

  adminUsersApi
    .updateRole(userId, nextRole)
    .then((result) => {
      message.value = `??????${roleText}`;
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
 * ??????????
 * ????? refresh token????????
 * ?????
 * ??????
 */
const revokeSessions = () => {
  if (!userDetail.value) {
    return;
  }

  const confirmed = window.confirm(`?????${userDetail.value.displayName}????????`);
  if (!confirmed) {
    return;
  }

  revoking.value = true;
  message.value = "";

  adminUsersApi
    .revokeSessions(userId)
    .then((result) => {
      message.value = `??? ${result.revokedCount} ???`;
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
 * ?????????
 * ?????????????? replay?
 * ???attemptId - attempt id?
 * ??????
 */
const goToReplay = (attemptId: string) => {
  window.open(`${playerBaseUrl}/replay/${attemptId}`, "_blank");
};

/**
 * ???????
 * ??????????
 * ?????
 * ??????
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
    <AdminPageHeader title="????" description="????????????????????">
      <template #actions>
        <button class="btn-ghost" @click="backToList">????</button>
      </template>
    </AdminPageHeader>

    <AdminListState
      :loading="detailLoading"
      :error="detailError"
      :empty="!userDetail && !detailLoading && !detailError"
      empty-text="?????"
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
                  {{ userDetail.role === "ADMIN" ? "???" : "????" }} ·
                  {{ userDetail.status === "ACTIVE" ? "??" : "???" }}
                </p>
              </div>
            </div>

            <dl class="admin-user-info-list">
              <div><dt>????</dt><dd>{{ formatDateTime(userDetail.lastLoginAt) }}</dd></div>
              <div><dt>????</dt><dd>{{ formatDateTime(userDetail.createdAt) }}</dd></div>
              <div><dt>????</dt><dd>{{ userDetail.activeSessionCount }}</dd></div>
            </dl>

            <div class="admin-user-detail-actions">
              <button class="btn-ghost" :disabled="statusUpdating" @click="toggleUserStatus">
                {{ statusUpdating ? "???..." : userDetail.status === "ACTIVE" ? "????" : "????" }}
              </button>
              <button class="btn-ghost" :disabled="roleUpdating" @click="toggleUserRole">
                {{ roleUpdating ? "???..." : userDetail.role === "ADMIN" ? "??????" : "?????" }}
              </button>
              <button class="btn-ghost" :disabled="revoking" @click="revokeSessions">
                {{ revoking ? "???..." : "?????" }}
              </button>
            </div>

            <p v-if="message" :class="isError ? 'error-msg' : 'success-msg'">{{ message }}</p>
          </section>

          <section class="card admin-user-stats-panel">
            <h3>????</h3>
            <p>??? {{ userDetail.stats.completedLevelCount }} ?</p>
            <p>???? {{ userDetail.stats.totalScore }}</p>
            <p v-if="userDetail.stats.activeTitle">
              ?????{{ userDetail.stats.activeTitle.name }}
            </p>
            <p>???{{ userDetail.stats.rank.label }}</p>
          </section>

          <section class="card admin-user-stats-panel">
            <h3>????</h3>
            <template v-if="userDetail.wallet">
              <p>?? {{ userDetail.wallet.balance }}</p>
              <p>???? {{ userDetail.wallet.totalEarned }}</p>
              <p>???? {{ userDetail.wallet.totalSpent }}</p>
              <p>???? {{ userDetail.wallet.currentStreak }} ?</p>
            </template>
            <p v-else class="admin-user-empty-hint">??????</p>
          </section>

          <section class="card admin-user-stats-panel">
            <h3>??</h3>
            <p>??? {{ userDetail.badges.unlockedCount }} / {{ userDetail.badges.totalCount }}</p>
            <ul v-if="userDetail.badges.items.length > 0" class="admin-user-badge-list">
              <li v-for="badge in userDetail.badges.items" :key="badge.id">{{ badge.name }}</li>
            </ul>
            <p v-else class="admin-user-empty-hint">???????</p>
          </section>
        </div>

        <section class="card admin-user-attempts">
          <h3>?? Attempt ??</h3>
          <template v-if="userDetail.recentAttempts.length > 0">
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th>??</th>
                    <th>??</th>
                    <th>??</th>
                    <th>????</th>
                    <th>????</th>
                    <th>??</th>
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
                      <button class="btn-ghost admin-table-btn" @click="goToReplay(attempt.id)">??</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
          <p v-else class="admin-user-empty-hint">??????</p>
        </section>
      </template>
    </AdminListState>
  </section>
</template>
