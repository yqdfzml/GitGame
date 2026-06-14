<script setup lang="ts">
import { ref } from "vue";
import { Shield } from "lucide-vue-next";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

/** 表单：邮箱 */
const email = ref("admin@gitgame.local");
/** 表单：密码 */
const password = ref("");
/** 错误信息 */
const error = ref("");

/**
 * 提交管理员登录。
 * 功能：校验 ADMIN 角色后进入 Dashboard。
 * 参数：无。
 * 返回值：无。
 */
const handleSubmit = () => {
  error.value = "";
  auth
    .login(email.value, password.value)
    .then(() => {
      if (!auth.isAdmin) {
        error.value = "该账号不是管理员，无法登录管理后台";
        return auth.logout();
      }
      const redirect = (route.query.redirect as string) || "/dashboard";
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
          <Shield aria-hidden="true" />
        </div>
        <h1>GitGame 管理后台</h1>
        <p>仅限管理员账号登录</p>
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
        <button type="submit" class="btn-primary btn-block">登录管理后台</button>
        <p v-if="error" class="error-msg">{{ error }}</p>
      </form>
    </div>
  </div>
</template>
