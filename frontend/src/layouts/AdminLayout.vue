<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { ArrowLeft, BookOpenCheck, History, LayoutDashboard, Ticket, Users } from "lucide-vue-next";

/** 当前路由，用于高亮侧边栏 */
const route = useRoute();

/** 后台主导航项 */
const navItems = [
  { to: "/admin/dashboard", label: "总览", icon: LayoutDashboard },
  { to: "/admin/levels", label: "关卡管理", icon: BookOpenCheck },
  { to: "/admin/users", label: "用户管理", icon: Users },
  { to: "/admin/attempts", label: "学习记录", icon: History },
  { to: "/admin/invites", label: "邀请码", icon: Ticket },
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

      <RouterLink to="/" class="admin-shell-exit">
        <ArrowLeft aria-hidden="true" />
        返回前台
      </RouterLink>
    </aside>

    <div class="admin-shell-main">
      <header class="admin-shell-topbar">
        <h2>{{ pageTitle }}</h2>
      </header>
      <main class="admin-shell-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>
