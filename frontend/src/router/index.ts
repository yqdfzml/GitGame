import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("../views/HomeView.vue"),
    },
    {
      path: "/login",
      name: "login",
      component: () => import("../views/LoginView.vue"),
      meta: { guest: true },
    },
    {
      path: "/register",
      name: "register",
      component: () => import("../views/RegisterView.vue"),
      meta: { guest: true },
    },
    {
      path: "/levels",
      name: "levels",
      component: () => import("../views/LevelsView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/levels/:chapterId",
      name: "chapter-levels",
      component: () => import("../views/ChapterLevelsView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/achievements",
      name: "achievements",
      component: () => import("../views/AchievementsView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/practice/:levelId",
      name: "practice",
      component: () => import("../views/PracticeView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/replay/:attemptId",
      name: "replay",
      component: () => import("../views/ReplayView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/leaderboard",
      name: "leaderboard",
      component: () => import("../views/LeaderboardView.vue"),
    },
    {
      path: "/admin",
      component: () => import("../layouts/AdminLayout.vue"),
      meta: { requiresAuth: true, requiresAdmin: true },
      children: [
        {
          path: "",
          redirect: "/admin/dashboard",
        },
        {
          path: "dashboard",
          name: "admin-dashboard",
          component: () => import("../views/admin/AdminDashboardView.vue"),
          meta: { requiresAuth: true, requiresAdmin: true, adminTitle: "总览 Dashboard" },
        },
        {
          path: "levels",
          name: "admin-levels",
          component: () => import("../views/admin/AdminLevelsView.vue"),
          meta: { requiresAuth: true, requiresAdmin: true, adminTitle: "关卡管理" },
        },
        {
          path: "users",
          name: "admin-users",
          component: () => import("../views/admin/AdminUsersView.vue"),
          meta: { requiresAuth: true, requiresAdmin: true, adminTitle: "用户管理" },
        },
        {
          path: "users/:id",
          name: "admin-user-detail",
          component: () => import("../views/admin/AdminUserDetailView.vue"),
          meta: { requiresAuth: true, requiresAdmin: true, adminTitle: "用户详情" },
        },
        {
          path: "attempts",
          name: "admin-attempts",
          component: () => import("../views/admin/AdminAttemptsView.vue"),
          meta: { requiresAuth: true, requiresAdmin: true, adminTitle: "学习记录" },
        },
        {
          path: "attempts/:id",
          name: "admin-attempt-detail",
          component: () => import("../views/admin/AdminAttemptDetailView.vue"),
          meta: { requiresAuth: true, requiresAdmin: true, adminTitle: "Attempt 详情" },
        },
        {
          path: "invites",
          name: "admin-invites",
          component: () => import("../views/admin/AdminInvitesView.vue"),
          meta: { requiresAuth: true, requiresAdmin: true, adminTitle: "邀请码管理" },
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
    next({ name: "home" });
    return;
  }
  if (to.meta.guest && auth.isLoggedIn) {
    next({ name: "home" });
    return;
  }
  next();
});

export default router;
