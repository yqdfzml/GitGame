<script setup lang="ts">
import { ref } from "vue";
import { GitBranch } from "lucide-vue-next";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const router = useRouter();

/** 表单：邮箱 */
const email = ref("");
/** 表单：密码 */
const password = ref("");
/** 表单：昵称 */
const displayName = ref("");
/** 错误信息 */
const error = ref("");

/**
 * 提交注册表单。
 * 功能：注册并跳转关卡列表。
 * 参数：无。
 * 返回值：无。
 */
const handleSubmit = () => {
  error.value = "";
  auth.register(email.value, password.value, displayName.value)
    .then(() => router.push("/"))
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
        <h1>创建账号</h1>
        <p>加入 GitGame，动手学 Git</p>
      </div>
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label>昵称</label>
          <input v-model="displayName" required maxlength="64" autocomplete="nickname" />
        </div>
        <div class="form-group">
          <label>邮箱</label>
          <input v-model="email" type="email" required autocomplete="email" />
        </div>
        <div class="form-group">
          <label>密码（至少 6 位）</label>
          <input v-model="password" type="password" required minlength="6" autocomplete="new-password" />
        </div>
        <button type="submit" class="btn-primary btn-block">注册</button>
        <p v-if="error" class="error-msg">{{ error }}</p>
      </form>
      <p class="auth-footer">
        已有账号？<RouterLink to="/login">登录</RouterLink>
      </p>
    </div>
  </div>
</template>
