<script setup lang="ts">
import { onMounted } from "vue";
import { RouterLink, RouterView } from "vue-router";
import { useAuthStore } from "./stores/auth";

const auth = useAuthStore();

onMounted(() => {
  auth.restoreSession();
});

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
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <RouterLink to="/levels" class="brand">GitGame</RouterLink>
      <nav class="nav-links">
        <RouterLink to="/levels">关卡</RouterLink>
        <RouterLink to="/leaderboard">排行榜</RouterLink>
        <RouterLink v-if="auth.isAdmin" to="/admin">管理</RouterLink>
      </nav>
      <div class="user-area">
        <span v-if="auth.user" class="user-name">{{ auth.user.displayName || auth.user.id }}</span>
        <button v-if="auth.isLoggedIn" class="btn-ghost" @click="handleLogout">登出</button>
        <RouterLink v-else to="/login" class="btn-primary">登录</RouterLink>
      </div>
    </header>
    <main class="main-content">
      <RouterView />
    </main>
  </div>
</template>
