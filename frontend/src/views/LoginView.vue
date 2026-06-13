<script setup lang="ts">
import { ref } from "vue";
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
      const redirect = (route.query.redirect as string) || "/levels";
      router.push(redirect);
    })
    .catch((err: Error) => {
      error.value = err.message;
    });
};
</script>

<template>
  <div class="auth-page card">
    <h1 class="page-title">登录</h1>
    <p class="page-desc">登录后开始 Git 练习</p>
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label>邮箱</label>
        <input v-model="email" type="email" required />
      </div>
      <div class="form-group">
        <label>密码</label>
        <input v-model="password" type="password" required />
      </div>
      <button type="submit" class="btn-primary" style="width:100%">登录</button>
      <p v-if="error" class="error-msg">{{ error }}</p>
    </form>
    <p style="margin-top:16px;color:var(--text-muted);font-size:0.9rem">
      还没有账号？<RouterLink to="/register">注册</RouterLink>
    </p>
  </div>
</template>
