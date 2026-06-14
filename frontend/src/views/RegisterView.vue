<script setup lang="ts">
import { ref } from "vue";
import { GitBranch } from "lucide-vue-next";
import { useRouter } from "vue-router";
import AvatarCropPicker from "../components/AvatarCropPicker.vue";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const router = useRouter();

/** 表单：英雄帖 */
const heroInviteCode = ref("");
/** 表单：邮箱 */
const email = ref("");
/** 表单：密码 */
const password = ref("");
/** 表单：昵称 */
const displayName = ref("");
/** 裁剪后的头像文件 */
const avatarFile = ref<File | null>(null);
/** 错误信息 */
const error = ref("");
/** 是否提交中 */
const submitting = ref(false);

/**
 * 接收头像裁剪结果。
 * 功能：保存裁剪文件供注册上传。
 * 参数：file - 裁剪后的头像；null 表示未就绪。
 * 返回值：无。
 */
const handleAvatarChange = (file: File | null) => {
  avatarFile.value = file;
};

/**
 * 提交注册表单。
 * 功能：校验英雄帖与头像后注册并跳转首页。
 * 参数：无。
 * 返回值：无。
 */
const handleSubmit = () => {
  error.value = "";

  if (!avatarFile.value) {
    error.value = "请先选择并裁剪头像";
    return;
  }

  submitting.value = true;
  auth
    .register({
      heroInviteCode: heroInviteCode.value.trim(),
      email: email.value,
      password: password.value,
      displayName: displayName.value,
      avatar: avatarFile.value,
    })
    .then(() => router.push("/"))
    .catch((err: Error) => {
      error.value = err.message;
    })
    .finally(() => {
      submitting.value = false;
    });
};
</script>

<template>
  <div class="auth-layout">
    <div class="card auth-card auth-card-wide">
      <div class="auth-logo">
        <div class="auth-logo-mark auth-logo-icon">
          <GitBranch aria-hidden="true" />
        </div>
        <h1>拜入 GitGame</h1>
        <p>持英雄帖入门，择头像定形</p>
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label>英雄帖</label>
          <input
            v-model="heroInviteCode"
            required
            maxlength="32"
            autocomplete="off"
            placeholder="输入邀请码"
          />
        </div>

        <div class="form-group">
          <label>头像（必选）</label>
          <AvatarCropPicker @change="handleAvatarChange" />
        </div>

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

        <button type="submit" class="btn-primary btn-block" :disabled="submitting">
          {{ submitting ? "注册中..." : "注册" }}
        </button>
        <p v-if="error" class="error-msg">{{ error }}</p>
      </form>

      <p class="auth-footer">
        已有账号？<RouterLink to="/login">登录</RouterLink>
      </p>
    </div>
  </div>
</template>
