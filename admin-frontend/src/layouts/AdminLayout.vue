<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ArrowLeft, BookOpenCheck, History, LayoutDashboard, LogOut, Ticket, Trophy, Users } from "lucide-vue-next";
import { useAuthStore } from "../stores/auth";

/** 当前路由，用于高亮侧边栏 */
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

/** 玩家端地址，管理后台与前台分离后通过环境变量跳转 */
const playerUrl = import.meta.env.VITE_PLAYER_URL ?? "http://localhost:5173";

/** 后台主导航项 */
const navItems = [
  { to: "/dashboard", label: "总览", icon: LayoutDashboard },
  { to: "/levels", label: "关卡管理", icon: BookOpenCheck },
  { to: "/users", label: "用户管理", icon: Users },
  { to: "/attempts", label: "学习记录", icon: History },
  { to: "/invites", label: "邀请码", icon: Ticket },
  { to: "/gamification", label: "积分徽章", icon: Trophy },
];

/**
 * 判断导航项是否激活。
 * 功能：匹配当前路由路径。
 * 参数：path - 导航目标路径。
 * 返回值：是否高亮。
 */
const isActive = (path: string) => {
  return route.path === path || route.path.startsWith(`${path}/`);
};

/** 当前模块标题，从路由 meta 读取 */
const pageTitle = computed(() => {
  return (route.meta.adminTitle as string) ?? "管理后台";
});

/**
 * 管理员登出。
 * 功能：清除会话并跳转登录页。
 * 参数：无。
 * 返回值：无。
 */
const handleLogout = () => {
  auth.logout().then(() => {
    router.push({ name: "login" });
  });
};
</script>

<template>
  <div class="admin-shell">
    <aside class="admin-shell-nav card">
      <div class="admin-shell-brand">
        <strong>GitGame</strong>
        <span>管理后台</span>
      </div>

      <nav class="admin-shell-menu">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="admin-shell-menu-item"
          :class="{ active: isActive(item.to) }"
        >
          <component :is="item.icon" aria-hidden="true" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <a :href="playerUrl" class="admin-shell-exit" target="_blank" rel="noopener noreferrer">
        <ArrowLeft aria-hidden="true" />
        前往玩家端
      </a>
    </aside>

    <div class="admin-shell-main">
      <header class="admin-shell-topbar">
        <h2>{{ pageTitle }}</h2>
        <div v-if="auth.user" class="admin-shell-topbar-actions">
          <span class="admin-shell-user">{{ auth.user.displayName }}</span>
          <button type="button" class="btn-ghost admin-shell-logout" @click="handleLogout">
            <LogOut aria-hidden="true" />
            登出
          </button>
        </div>
      </header>
      <main class="admin-shell-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>
