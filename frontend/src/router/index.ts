import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/levels" },
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
      name: "admin",
      component: () => import("../views/AdminView.vue"),
      meta: { requiresAuth: true, requiresAdmin: true },
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
    next({ name: "levels" });
    return;
  }
  if (to.meta.guest && auth.isLoggedIn) {
    next({ name: "levels" });
    return;
  }
  next();
});

export default router;
