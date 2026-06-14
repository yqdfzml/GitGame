<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { adminInvitesApi } from "../api/client";
import AdminListState from "../components/admin/AdminListState.vue";
import AdminPageHeader from "../components/admin/AdminPageHeader.vue";
import type { AdminInviteListItem } from "../types/admin";

/** 邀请码列表 */
const inviteList = ref<AdminInviteListItem[]>([]);
/** 列表加载中 */
const listLoading = ref(true);
/** 列表错误 */
const listError = ref("");
/** 操作反馈 */
const message = ref("");
/** 是否错误反馈 */
const isError = ref(false);
/** 创建中 */
const creating = ref(false);
/** 作废中 id */
const revokingId = ref("");
/** 新建备注 */
const createNote = ref("");
/** 新建过期日期 */
const createExpiresAt = ref("");

/**
 * 加载邀请码列表。
 * 功能：请求全部英雄帖记录。
 * 参数：无。
 * 返回值：无。
 */
const loadInviteList = () => {
  listLoading.value = true;
  listError.value = "";

  adminInvitesApi
    .listInvites()
    .then((data) => {
      inviteList.value = data;
    })
    .catch((err: Error) => {
      listError.value = err.message;
    })
    .finally(() => {
      listLoading.value = false;
    });
};

/**
 * 创建邀请码。
 * 功能：提交备注与可选过期时间，生成新英雄帖。
 * 参数：无。
 * 返回值：无。
 */
const createInvite = () => {
  creating.value = true;
  message.value = "";
  isError.value = false;

  const payload: { note?: string; expiresAt?: string } = {};
  if (createNote.value.trim()) {
    payload.note = createNote.value.trim();
  }
  if (createExpiresAt.value) {
    payload.expiresAt = new Date(createExpiresAt.value).toISOString();
  }

  adminInvitesApi
    .createInvite(payload)
    .then((result) => {
      message.value = `已创建邀请码：${result.code}`;
      isError.value = false;
      createNote.value = "";
      createExpiresAt.value = "";
      loadInviteList();
    })
    .catch((err: Error) => {
      message.value = err.message;
      isError.value = true;
    })
    .finally(() => {
      creating.value = false;
    });
};

/**
 * 作废邀请码。
 * 功能：仅允许作废未使用的邀请码。
 * 参数：invite - 目标邀请码。
 * 返回值：无。
 */
const revokeInvite = (invite: AdminInviteListItem) => {
  const confirmed = window.confirm(`确认作废邀请码「${invite.code}」？`);
  if (!confirmed) {
    return;
  }

  revokingId.value = invite.id;
  message.value = "";

  adminInvitesApi
    .revokeInvite(invite.id)
    .then(() => {
      message.value = `邀请码 ${invite.code} 已作废`;
      isError.value = false;
      loadInviteList();
    })
    .catch((err: Error) => {
      message.value = err.message;
      isError.value = true;
    })
    .finally(() => {
      revokingId.value = "";
    });
};

/**
 * 复制邀请码到剪贴板。
 * 功能：方便运营发给测试用户。
 * 参数：code - 邀请码明文。
 * 返回值：无。
 */
const copyInviteCode = (code: string) => {
  navigator.clipboard.writeText(code).then(() => {
    message.value = `已复制：${code}`;
    isError.value = false;
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
  unused: "未使用",
  used: "已使用",
  expired: "已过期",
  revoked: "已作废",
};

/** 列表是否为空 */
const listEmpty = computed(() => inviteList.value.length === 0);

onMounted(() => {
  loadInviteList();
});
</script>

<template>
  <section class="admin-invites-page">
    <AdminPageHeader title="邀请码管理" description="创建英雄帖、查看使用状态，支持备注与作废。" />

    <section class="card admin-invite-create">
      <h3>创建邀请码</h3>
      <div class="admin-invite-create-grid">
        <label class="admin-filter-label">
          备注
          <input v-model="createNote" type="text" placeholder="例如：发给张三测试" />
        </label>
        <label class="admin-filter-label">
          过期时间
          <input v-model="createExpiresAt" type="datetime-local" />
        </label>
        <button class="btn-primary" :disabled="creating" @click="createInvite">
          {{ creating ? "创建中..." : "创建邀请码" }}
        </button>
      </div>
      <p v-if="message" :class="isError ? 'error-msg' : 'success-msg'">{{ message }}</p>
    </section>

    <div class="admin-users-table card">
      <AdminListState
        :loading="listLoading"
        :error="listError"
        :empty="listEmpty"
        empty-text="暂无邀请码"
      >
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>邀请码</th>
                <th>备注</th>
                <th>状态</th>
                <th>使用人</th>
                <th>过期时间</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="invite in inviteList" :key="invite.id">
                <td class="mono">{{ invite.code }}</td>
                <td>{{ invite.note ?? "—" }}</td>
                <td>
                  <span class="admin-status-tag" :class="invite.status === 'unused' ? 'ok' : 'warn'">
                    {{ statusLabelMap[invite.status] ?? invite.status }}
                  </span>
                </td>
                <td>
                  <template v-if="invite.usedBy">
                    {{ invite.usedBy.displayName }}
                    <span class="admin-attempt-sub">{{ invite.usedBy.email }}</span>
                  </template>
                  <span v-else>—</span>
                </td>
                <td>{{ formatDateTime(invite.expiresAt) }}</td>
                <td>{{ formatDateTime(invite.createdAt) }}</td>
                <td>
                  <button class="btn-ghost admin-table-btn" @click="copyInviteCode(invite.code)">复制</button>
                  <button
                    v-if="invite.status === 'unused'"
                    class="btn-ghost admin-table-btn"
                    :disabled="revokingId === invite.id"
                    @click="revokeInvite(invite)"
                  >
                    {{ revokingId === invite.id ? "处理中..." : "作废" }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </AdminListState>
    </div>
  </section>
</template>
