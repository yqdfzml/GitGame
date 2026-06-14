<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { adminGamificationApi } from "../api/client";
import AdminListState from "../components/admin/AdminListState.vue";
import AdminPageHeader from "../components/admin/AdminPageHeader.vue";
import type {
  AdminBadgeDefinitionItem,
  AdminLeaderboardItem,
  AdminLedgerListResult,
  AdminUnlockListItem,
  AdminWalletListItem,
} from "../types/admin";

/** 积分钱包列表 */
const walletList = ref<AdminWalletListItem[]>([]);
/** 积分流水结果 */
const ledgerResult = ref<AdminLedgerListResult | null>(null);
/** 关卡解锁列表 */
const unlockList = ref<AdminUnlockListItem[]>([]);
/** 徽章定义列表 */
const badgeList = ref<AdminBadgeDefinitionItem[]>([]);
/** 排行榜列表 */
const leaderboardList = ref<AdminLeaderboardItem[]>([]);

/** 钱包搜索词 */
const walletSearch = ref("");
/** 流水搜索词 */
const ledgerSearch = ref("");
/** 解锁搜索词 */
const unlockSearch = ref("");
/** 排行榜关卡 ID */
const leaderboardLevelId = ref("");

/** 各区块加载状态 */
const walletLoading = ref(true);
const ledgerLoading = ref(true);
const unlockLoading = ref(true);
const badgeLoading = ref(true);
const leaderboardLoading = ref(true);

/** 各区块错误信息 */
const walletError = ref("");
const ledgerError = ref("");
const unlockError = ref("");
const badgeError = ref("");
const leaderboardError = ref("");

/** 积分流水原因映射 */
const reasonLabelMap: Record<string, string> = {
  CHECK_IN: "签到",
  UNLOCK_LEVEL: "解锁关卡",
  ADMIN_GRANT: "管理员赠送",
};

/** 赠送目标邮箱 */
const grantEmail = ref("");
/** 赠送积分数量 */
const grantAmount = ref("");
/** 是否正在赠送 */
const granting = ref(false);
/** 赠送操作反馈 */
const grantMessage = ref("");
/** 赠送反馈是否为错误 */
const grantIsError = ref(false);

/**
 * 提交赠送积分。
 * 功能：按邮箱定位用户并增加积分，成功后刷新钱包与流水。
 * 参数：payload - 可选指定邮箱与数量，不传则用表单值。
 * 返回值：无。
 */
const submitGrantPoints = (payload?: { email?: string; amount?: number }) => {
  const email = payload?.email ?? grantEmail.value.trim();
  const amount = payload?.amount ?? Number(grantAmount.value);

  if (!email) {
    grantMessage.value = "请填写用户邮箱";
    grantIsError.value = true;
    return;
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    grantMessage.value = "赠送积分必须是大于 0 的整数";
    grantIsError.value = true;
    return;
  }

  granting.value = true;
  grantMessage.value = "";
  grantIsError.value = false;

  adminGamificationApi
    .grantPoints({ email, amount })
    .then((result) => {
      grantMessage.value = `已向 ${result.userDisplayName} 赠送 ${result.amount} 积分，当前余额 ${result.balance}`;
      grantIsError.value = false;
      if (!payload) {
        grantAmount.value = "";
      }
      loadWallets();
      loadLedgers();
    })
    .catch((err: Error) => {
      grantMessage.value = err.message;
      grantIsError.value = true;
    })
    .finally(() => {
      granting.value = false;
    });
};

/**
 * 从钱包列表快速赠送。
 * 功能：预填邮箱并弹出确认，确认后执行赠送。
 * 参数：wallet - 目标用户钱包。
 * 返回值：无。
 */
const quickGrantFromWallet = (wallet: AdminWalletListItem) => {
  grantEmail.value = wallet.userEmail;
  const input = window.prompt(`向 ${wallet.userDisplayName} 赠送积分`, "10");
  if (input === null) {
    return;
  }
  const amount = Number(input);
  if (!Number.isInteger(amount) || amount <= 0) {
    grantMessage.value = "赠送积分必须是大于 0 的整数";
    grantIsError.value = true;
    return;
  }
  submitGrantPoints({ email: wallet.userEmail, amount });
};

/**
 * 加载积分钱包列表。
 * 功能：按搜索词查询用户钱包。
 * 参数：无。
 * 返回值：无。
 */
const loadWallets = () => {
  walletLoading.value = true;
  walletError.value = "";
  adminGamificationApi
    .listWallets({ search: walletSearch.value || undefined, page: 1, pageSize: 10 })
    .then((result) => {
      walletList.value = result.items;
    })
    .catch((err: Error) => {
      walletError.value = err.message;
    })
    .finally(() => {
      walletLoading.value = false;
    });
};

/**
 * 加载积分流水。
 * 功能：按搜索词查询最近流水。
 * 参数：无。
 * 返回值：无。
 */
const loadLedgers = () => {
  ledgerLoading.value = true;
  ledgerError.value = "";
  adminGamificationApi
    .listLedgers({ search: ledgerSearch.value || undefined, page: 1, pageSize: 10 })
    .then((result) => {
      ledgerResult.value = result;
    })
    .catch((err: Error) => {
      ledgerError.value = err.message;
    })
    .finally(() => {
      ledgerLoading.value = false;
    });
};

/**
 * 加载关卡解锁记录。
 * 功能：按搜索词查询解锁历史。
 * 参数：无。
 * 返回值：无。
 */
const loadUnlocks = () => {
  unlockLoading.value = true;
  unlockError.value = "";
  adminGamificationApi
    .listUnlocks({ search: unlockSearch.value || undefined, page: 1, pageSize: 10 })
    .then((result) => {
      unlockList.value = result.items;
    })
    .catch((err: Error) => {
      unlockError.value = err.message;
    })
    .finally(() => {
      unlockLoading.value = false;
    });
};

/**
 * 加载徽章定义。
 * 功能：只读展示全部徽章配置。
 * 参数：无。
 * 返回值：无。
 */
const loadBadges = () => {
  badgeLoading.value = true;
  badgeError.value = "";
  adminGamificationApi
    .listBadgeDefinitions()
    .then((result) => {
      badgeList.value = result;
    })
    .catch((err: Error) => {
      badgeError.value = err.message;
    })
    .finally(() => {
      badgeLoading.value = false;
    });
};

/**
 * 加载排行榜。
 * 功能：支持全局或单关查询。
 * 参数：无。
 * 返回值：无。
 */
const loadLeaderboard = () => {
  leaderboardLoading.value = true;
  leaderboardError.value = "";
  adminGamificationApi
    .getLeaderboard(leaderboardLevelId.value || undefined, 20)
    .then((result) => {
      leaderboardList.value = result;
    })
    .catch((err: Error) => {
      leaderboardError.value = err.message;
    })
    .finally(() => {
      leaderboardLoading.value = false;
    });
};

/**
 * 格式化日期时间。
 * 功能：将 ISO 字符串转为本地可读格式。
 * 参数：value - 时间字符串或 null。
 * 返回值：展示文本。
 */
const formatDateTime = (value: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("zh-CN");
};

/** 钱包列表是否为空 */
const walletEmpty = computed(() => walletList.value.length === 0);
/** 流水列表是否为空 */
const ledgerEmpty = computed(() => (ledgerResult.value?.items.length ?? 0) === 0);
/** 解锁列表是否为空 */
const unlockEmpty = computed(() => unlockList.value.length === 0);
/** 徽章列表是否为空 */
const badgeEmpty = computed(() => badgeList.value.length === 0);
/** 排行榜是否为空 */
const leaderboardEmpty = computed(() => leaderboardList.value.length === 0);

onMounted(() => {
  loadWallets();
  loadLedgers();
  loadUnlocks();
  loadBadges();
  loadLeaderboard();
});
</script>

<template>
  <section class="admin-gamification-page">
    <AdminPageHeader
      title="积分与徽章"
      description="查看积分钱包、流水、解锁记录，并向用户赠送积分。"
    />

    <section class="card admin-gamification-section">
      <div class="admin-gamification-section-head">
        <h3>赠送积分</h3>
      </div>
      <div class="admin-points-grant-form">
        <label class="admin-points-grant-field">
          <span>用户邮箱</span>
          <input v-model="grantEmail" type="email" placeholder="demo@gitgame.local" />
        </label>
        <label class="admin-points-grant-field">
          <span>赠送数量</span>
          <input v-model="grantAmount" type="number" min="1" step="1" placeholder="10" />
        </label>
        <button class="btn-primary" :disabled="granting" @click="submitGrantPoints()">
          {{ granting ? "赠送中..." : "确认赠送" }}
        </button>
      </div>
      <p v-if="grantMessage" :class="grantIsError ? 'error-msg' : 'success-msg'">{{ grantMessage }}</p>
    </section>

    <section class="card admin-gamification-section">
      <div class="admin-gamification-section-head">
        <h3>排行榜</h3>
        <div class="admin-gamification-toolbar">
          <input v-model="leaderboardLevelId" type="text" placeholder="关卡 ID（留空=全局）" />
          <button class="btn-ghost" @click="loadLeaderboard">查询</button>
        </div>
      </div>
      <AdminListState
        :loading="leaderboardLoading"
        :error="leaderboardError"
        :empty="leaderboardEmpty"
        empty-text="暂无排行榜数据"
      >
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>排名</th>
                <th>用户</th>
                <th>关卡</th>
                <th>得分</th>
                <th>耗时(秒)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in leaderboardList" :key="`${item.userId}-${item.levelId}`">
                <td>{{ item.rank }}</td>
                <td>{{ item.displayName }}</td>
                <td>{{ item.levelTitle }}</td>
                <td>{{ item.score }}</td>
                <td>{{ item.durationSeconds }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </AdminListState>
    </section>

    <section class="card admin-gamification-section">
      <div class="admin-gamification-section-head">
        <h3>积分钱包</h3>
        <div class="admin-gamification-toolbar">
          <input v-model="walletSearch" type="search" placeholder="搜索用户" />
          <button class="btn-ghost" @click="loadWallets">查询</button>
        </div>
      </div>
      <AdminListState :loading="walletLoading" :error="walletError" :empty="walletEmpty" empty-text="暂无钱包数据">
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>用户</th>
                <th>余额</th>
                <th>累计获得</th>
                <th>累计消耗</th>
                <th>连签</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="wallet in walletList" :key="wallet.userId">
                <td>
                  <strong>{{ wallet.userDisplayName }}</strong>
                  <span class="admin-attempt-sub">{{ wallet.userEmail }}</span>
                </td>
                <td>{{ wallet.balance }}</td>
                <td>{{ wallet.totalEarned }}</td>
                <td>{{ wallet.totalSpent }}</td>
                <td>{{ wallet.currentStreak }} / {{ wallet.longestStreak }}</td>
                <td>
                  <button
                    class="btn-ghost admin-table-btn"
                    :disabled="granting"
                    @click="quickGrantFromWallet(wallet)"
                  >
                    赠送
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </AdminListState>
    </section>

    <section class="card admin-gamification-section">
      <div class="admin-gamification-section-head">
        <h3>积分流水</h3>
        <div class="admin-gamification-toolbar">
          <input v-model="ledgerSearch" type="search" placeholder="搜索用户" />
          <button class="btn-ghost" @click="loadLedgers">查询</button>
        </div>
      </div>
      <AdminListState :loading="ledgerLoading" :error="ledgerError" :empty="ledgerEmpty" empty-text="暂无流水记录">
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>用户</th>
                <th>变动</th>
                <th>余额</th>
                <th>原因</th>
                <th>关卡</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ledger in ledgerResult?.items ?? []" :key="ledger.id">
                <td>{{ ledger.userDisplayName }}</td>
                <td :class="ledger.delta >= 0 ? 'text-positive' : 'text-negative'">{{ ledger.delta }}</td>
                <td>{{ ledger.balanceAfter }}</td>
                <td>{{ reasonLabelMap[ledger.reason] ?? ledger.reason }}</td>
                <td>{{ ledger.levelTitle ?? "—" }}</td>
                <td>{{ formatDateTime(ledger.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </AdminListState>
    </section>

    <section class="card admin-gamification-section">
      <div class="admin-gamification-section-head">
        <h3>关卡解锁记录</h3>
        <div class="admin-gamification-toolbar">
          <input v-model="unlockSearch" type="search" placeholder="搜索用户" />
          <button class="btn-ghost" @click="loadUnlocks">查询</button>
        </div>
      </div>
      <AdminListState :loading="unlockLoading" :error="unlockError" :empty="unlockEmpty" empty-text="暂无解锁记录">
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>用户</th>
                <th>关卡</th>
                <th>消耗积分</th>
                <th>解锁时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="unlock in unlockList" :key="unlock.id">
                <td>{{ unlock.userDisplayName }}</td>
                <td>{{ unlock.levelTitle }}</td>
                <td>{{ unlock.cost }}</td>
                <td>{{ formatDateTime(unlock.unlockedAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </AdminListState>
    </section>

    <section class="card admin-gamification-section">
      <div class="admin-gamification-section-head">
        <h3>徽章定义（只读）</h3>
      </div>
      <AdminListState :loading="badgeLoading" :error="badgeError" :empty="badgeEmpty" empty-text="暂无徽章定义">
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>名称</th>
                <th>分类</th>
                <th>说明</th>
                <th>档位</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="badge in badgeList" :key="badge.id">
                <td class="mono">{{ badge.id }}</td>
                <td>{{ badge.name }}</td>
                <td>{{ badge.category }}</td>
                <td>{{ badge.description }}</td>
                <td>{{ badge.visualTier }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </AdminListState>
    </section>
  </section>
</template>
