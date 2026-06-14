<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { adminUsersApi } from "../api/client";
import AdminListState from "../components/admin/AdminListState.vue";
import AdminPageHeader from "../components/admin/AdminPageHeader.vue";
import type { AdminUserListFilters, AdminUserListItem } from "../types/admin";

const router = useRouter();

/** ???? */
const userList = ref<AdminUserListItem[]>([]);
/** ???? */
const totalCount = ref(0);
/** ??????? */
const filters = ref<AdminUserListFilters>({
  search: "",
  role: "",
  status: "",
  page: 1,
  pageSize: 20,
});
/** ????? */
const listLoading = ref(true);
/** ???? */
const listError = ref("");

/**
 * ???????
 * ????????????????
 * ?????
 * ??????
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
 * ?????????
 * ?????????????????
 * ???userId - ?? id?
 * ??????
 */
const goToDetail = (userId: string) => {
  router.push({ name: "user-detail", params: { id: userId } });
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

/** ?????? */
const roleLabelMap: Record<string, string> = {
  USER: "????",
  ADMIN: "???",
};

/** ?????? */
const statusLabelMap: Record<string, string> = {
  ACTIVE: "??",
  DISABLED: "???",
};

/** ??? */
const totalPages = computed(() => {
  return Math.max(1, Math.ceil(totalCount.value / filters.value.pageSize));
});

/** ?????? */
const listEmpty = computed(() => userList.value.length === 0);

/**
 * ??????
 * ?????? 1 ??????
 * ?????
 * ??????
 */
const goPrevPage = () => {
  if (filters.value.page <= 1) {
    return;
  }
  filters.value.page -= 1;
};

/**
 * ??????
 * ?????? 1 ??????
 * ?????
 * ??????
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
    <AdminPageHeader title="????" description="??????????????????????" />

    <div class="admin-users-toolbar card">
      <label class="admin-filter-label">
        ???? / ??
        <input
          v-model="filters.search"
          type="search"
          placeholder="?????"
          @keyup.enter="filters.page = 1"
        />
      </label>
      <label class="admin-filter-label">
        ??
        <select v-model="filters.role" class="admin-filter-select" @change="filters.page = 1">
          <option value="">????</option>
          <option value="USER">????</option>
          <option value="ADMIN">???</option>
        </select>
      </label>
      <label class="admin-filter-label">
        ??
        <select v-model="filters.status" class="admin-filter-select" @change="filters.page = 1">
          <option value="">????</option>
          <option value="ACTIVE">??</option>
          <option value="DISABLED">???</option>
        </select>
      </label>
    </div>

    <div class="admin-users-table card">
      <AdminListState
        :loading="listLoading"
        :error="listError"
        :empty="listEmpty"
        empty-text="???????"
      >
        <div class="table-wrap">
          <table class="table admin-users-data-table">
            <thead>
              <tr>
                <th>??</th>
                <th>??</th>
                <th>??</th>
                <th>??</th>
                <th>????</th>
                <th>????</th>
                <th>??</th>
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
                  <button class="btn-ghost admin-table-btn" @click="goToDetail(user.id)">??</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </AdminListState>

      <div class="admin-table-footer">
        <span>? {{ totalCount }} ??? {{ filters.page }} / {{ totalPages }} ?</span>
        <div class="admin-table-pagination">
          <button class="btn-ghost" :disabled="filters.page <= 1" @click="goPrevPage">???</button>
          <button class="btn-ghost" :disabled="filters.page >= totalPages" @click="goNextPage">???</button>
        </div>
      </div>
    </div>
  </section>
</template>
