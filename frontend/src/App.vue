<script setup lang="ts">
import { BookOpenCheck, GitBranch, Medal, Shield, Trophy } from "lucide-vue-next";
import { onMounted, ref, watch } from "vue";
import { RouterLink, RouterView } from "vue-router";
import { usersApi } from "./api/client";
import { useAuthStore } from "./stores/auth";
import type { ActiveTitle } from "./types";

const auth = useAuthStore();
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
 * 处理登出点击。
 * 功能：调用 store 登出并跳转登录页。
 * 参数：无。
 * 返回值：无。
 */
const handleLogout = () => {
  auth.logout().then(() => {
    window.location.href = "/login";
  });
};

onMounted(loadUserTitle);
watch(() => auth.isLoggedIn, loadUserTitle);
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <RouterLink to="/levels" class="brand">
        <GitBranch class="brand-icon" aria-hidden="true" />
        <span>GitGame</span>
      </RouterLink>
      <nav class="nav-links">
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
        <RouterLink v-if="auth.isAdmin" to="/admin">
          <Shield aria-hidden="true" />
          管理
        </RouterLink>
      </nav>
      <div class="user-area">
        <span
          v-if="activeTitle"
          class="title-badge-chip"
          :style="{ '--title-color': activeTitle.color }"
        >
          {{ activeTitle.name }}
        </span>
        <div v-if="auth.user" class="user-chip">
          <span class="user-avatar">{{ userInitial() }}</span>
          {{ auth.user.displayName || auth.user.id }}
        </div>
        <button v-if="auth.isLoggedIn" class="btn-ghost" @click="handleLogout">登出</button>
        <RouterLink v-else to="/login" class="btn-primary">登录</RouterLink>
      </div>
    </header>
    <main class="main-content">
      <RouterView />
    </main>
  </div>
</template>
