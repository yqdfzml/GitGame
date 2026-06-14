<script setup lang="ts">
import { ref } from "vue";
import { GitBranch } from "lucide-vue-next";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

/** 表单：邮箱 */
const email = ref("demo@gitgame.local");
/** 表单：密码 */
const password = ref("demo123");
/** 错误信息 */
const error = ref("");

/**
 * 提交登录表单。
 * 功能：调用 auth store 登录并跳转。
 * 参数：无。
 * 返回值：无。
 */
const handleSubmit = () => {
  error.value = "";
  auth.login(email.value, password.value)
    .then(() => {
      const redirect = (route.query.redirect as string) || "/";
      router.push(redirect);
    })
    .catch((err: Error) => {
      error.value = err.message;
    });
};
</script>

<template>
  <div class="auth-layout">
    <div class="card auth-card">
      <div class="auth-logo">
        <div class="auth-logo-mark auth-logo-icon">
          <GitBranch aria-hidden="true" />
        </div>
        <h1>欢迎回来</h1>
        <p>登录后开始 Git 练习</p>
      </div>
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label>邮箱</label>
          <input v-model="email" type="email" required autocomplete="email" />
        </div>
        <div class="form-group">
          <label>密码</label>
          <input v-model="password" type="password" required autocomplete="current-password" />
        </div>
        <button type="submit" class="btn-primary btn-block">登录</button>
        <p v-if="error" class="error-msg">{{ error }}</p>
      </form>
      <p class="auth-footer">
        还没有账号？<RouterLink to="/register">持英雄帖注册</RouterLink>
      </p>
    </div>
  </div>
</template>
