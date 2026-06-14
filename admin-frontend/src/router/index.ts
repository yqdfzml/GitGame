import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/login",
      name: "login",
      component: () => import("../views/LoginView.vue"),
      meta: { guest: true },
    },
    {
      path: "/",
      component: () => import("../layouts/AdminLayout.vue"),
      meta: { requiresAuth: true, requiresAdmin: true },
      children: [
        { path: "", redirect: "/dashboard" },
        {
          path: "dashboard",
          name: "dashboard",
          component: () => import("../views/AdminDashboardView.vue"),
          meta: { requiresAuth: true, requiresAdmin: true, adminTitle: "总览 Dashboard" },
        },
        {
          path: "levels",
          name: "levels",
          component: () => import("../views/AdminLevelsView.vue"),
          meta: { requiresAuth: true, requiresAdmin: true, adminTitle: "关卡管理" },
        },
        {
          path: "users",
          name: "users",
          component: () => import("../views/AdminUsersView.vue"),
          meta: { requiresAuth: true, requiresAdmin: true, adminTitle: "用户管理" },
        },
        {
          path: "users/:id",
          name: "user-detail",
          component: () => import("../views/AdminUserDetailView.vue"),
          meta: { requiresAuth: true, requiresAdmin: true, adminTitle: "用户详情" },
        },
        {
          path: "attempts",
          name: "attempts",
          component: () => import("../views/AdminAttemptsView.vue"),
          meta: { requiresAuth: true, requiresAdmin: true, adminTitle: "学习记录" },
        },
        {
          path: "attempts/:id",
          name: "attempt-detail",
          component: () => import("../views/AdminAttemptDetailView.vue"),
          meta: { requiresAuth: true, requiresAdmin: true, adminTitle: "Attempt 详情" },
        },
        {
          path: "invites",
          name: "invites",
          component: () => import("../views/AdminInvitesView.vue"),
          meta: { requiresAuth: true, requiresAdmin: true, adminTitle: "邀请码管理" },
        },
        {
          path: "gamification",
          name: "gamification",
          component: () => import("../views/AdminGamificationView.vue"),
          meta: { requiresAuth: true, requiresAdmin: true, adminTitle: "积分与徽章" },
        },
      ],
    },
  ],
});

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore();

  if (!auth.bootstrapped) {
    auth.bootstrap().then(() => {
      router.replace(to.fullPath);
    });
    return;
  }

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    next({ name: "login", query: { redirect: to.fullPath } });
    return;
  }
  if (to.meta.requiresAdmin && !auth.isAdmin) {
    next({ name: "login" });
    return;
  }
  if (to.meta.guest && auth.isLoggedIn && auth.isAdmin) {
    next({ name: "dashboard" });
    return;
  }
  next();
});

export default router;
