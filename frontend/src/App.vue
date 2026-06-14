<script setup lang="ts">
import { BookOpenCheck, ChevronDown, GitBranch, Home, Medal, Trophy } from "lucide-vue-next";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { RouterLink, RouterView } from "vue-router";
import { usersApi } from "./api/client";
import { useAuthStore } from "./stores/auth";
import { usePointsStore } from "./stores/points";
import type { ActiveTitle } from "./types";

const auth = useAuthStore();
/** 积分钱包 Store，顶栏积分与其保持同步 */
const pointsStore = usePointsStore();
/** 当前主线称号，用于顶栏展示 */
const activeTitle = ref<ActiveTitle | null>(null);

/**
 * 获取用户名首字母，用于头像占位。
 * 功能：从 displayName 或 id 取首字符大写。
 * 参数：无。
 * 返回值：单字符字符串。
 */
const userInitial = () => {
  const name = auth.user?.displayName || auth.user?.id || "?";
  return name.charAt(0).toUpperCase();
};

/**
 * 加载用户当前称号。
 * 功能：登录状态下请求 stats 并更新顶栏称号徽章。
 * 参数：无。
 * 返回值：无。
 */
const loadUserTitle = () => {
  if (!auth.isLoggedIn) {
    activeTitle.value = null;
    return;
  }
  usersApi
    .stats()
    .then((stats) => {
      activeTitle.value = stats.activeTitle;
    })
    .catch(() => {
      activeTitle.value = null;
    });
};

/**
 * 加载顶栏用户相关数据。
 * 功能：登录后同时刷新称号与积分。
 * 参数：无。
 * 返回值：无。
 */
const loadUserHeader = () => {
  if (!auth.isLoggedIn) {
    activeTitle.value = null;
    pointsStore.clearWallet();
    return;
  }
  loadUserTitle();
  pointsStore.loadWallet();
};

/**
 * 处理登出点击。
 * 功能：调用 store 登出并跳转登录页。
 * 参数：无。
 * 返回值：无。
 */
const handleLogout = () => {
  closeUserMenu();
  auth.logout().then(() => {
    window.location.href = "/login";
  });
};

onMounted(() => {
  loadUserHeader();
  document.addEventListener("click", handleDocumentClick);
});

onUnmounted(() => {
  document.removeEventListener("click", handleDocumentClick);
});
watch(() => auth.isLoggedIn, loadUserHeader);

/** 顶栏展示的积分余额，来自 Store */
const topbarBalance = computed(() => pointsStore.balance);
/** 用户菜单是否展开 */
const userMenuOpen = ref(false);

/**
 * 切换用户菜单展开状态。
 * 功能：点击头像区域时展开或收起下拉菜单。
 * 参数：无。
 * 返回值：无。
 */
const toggleUserMenu = () => {
  userMenuOpen.value = !userMenuOpen.value;
};

/**
 * 关闭用户菜单。
 * 功能：收起下拉菜单。
 * 参数：无。
 * 返回值：无。
 */
const closeUserMenu = () => {
  userMenuOpen.value = false;
};

/**
 * 点击页面其他区域时关闭用户菜单。
 * 功能：避免菜单一直悬停打开。
 * 参数：event - 文档点击事件。
 * 返回值：无。
 */
const handleDocumentClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (!target.closest(".user-menu")) {
    closeUserMenu();
  }
};
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <RouterLink to="/" class="brand">
        <GitBranch class="brand-icon" aria-hidden="true" />
        <span>GitGame</span>
      </RouterLink>
      <nav class="nav-links">
        <RouterLink to="/">
          <Home aria-hidden="true" />
          首页
        </RouterLink>
        <RouterLink to="/levels">
          <BookOpenCheck aria-hidden="true" />
          关卡
        </RouterLink>
        <RouterLink to="/achievements">
          <Medal aria-hidden="true" />
          徽章
        </RouterLink>
        <RouterLink to="/leaderboard">
          <Trophy aria-hidden="true" />
          排行榜
        </RouterLink>
      </nav>
      <div class="user-area">
        <RouterLink
          v-if="topbarBalance !== null"
          to="/levels"
          class="topbar-points-chip"
          title="前往关卡页签到与解锁"
        >
          积分 {{ topbarBalance }}
        </RouterLink>
        <span
          v-if="activeTitle"
          class="title-badge-chip"
          :style="{ '--title-color': activeTitle.color }"
        >
          {{ activeTitle.name }}
        </span>
        <div v-if="auth.isLoggedIn && auth.user" class="user-menu">
          <button
            type="button"
            class="user-chip user-menu-trigger"
            :aria-expanded="userMenuOpen"
            aria-haspopup="menu"
            @click="toggleUserMenu"
          >
            <img
              v-if="auth.user.avatarUrl"
              :src="auth.user.avatarUrl"
              alt=""
              class="user-avatar-img"
            />
            <span v-else class="user-avatar">{{ userInitial() }}</span>
            <span class="user-menu-name">{{ auth.user.displayName || auth.user.id }}</span>
            <ChevronDown class="user-menu-chevron" aria-hidden="true" />
          </button>

          <div v-if="userMenuOpen" class="user-menu-panel" role="menu">
            <button type="button" class="user-menu-item" role="menuitem" @click="handleLogout">
              登出
            </button>
          </div>
        </div>
        <RouterLink v-else-if="!auth.isLoggedIn" to="/login" class="btn-primary">登录</RouterLink>
      </div>
    </header>
    <main class="main-content">
      <RouterView />
    </main>
  </div>
</template>
