<script setup lang="ts">
import { ref } from "vue";
import { GitBranch } from "lucide-vue-next";
import {
  NAlert,
  NButton,
  NConfigProvider,
  NForm,
  NFormItem,
  NInput,
} from "naive-ui";
import { useRouter } from "vue-router";
import AvatarCropPicker from "../components/AvatarCropPicker.vue";
import { gitgameDarkTheme, gitgameThemeOverrides } from "../naiveTheme";
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

  if (!displayName.value.trim()) {
    error.value = "请填写昵称";
    return;
  }
  if (!email.value.trim()) {
    error.value = "请填写邮箱";
    return;
  }
  if (password.value.length < 6) {
    error.value = "密码至少 6 位";
    return;
  }
  if (!heroInviteCode.value.trim()) {
    error.value = "请填写英雄帖";
    return;
  }
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
  <NConfigProvider :theme="gitgameDarkTheme" :theme-overrides="gitgameThemeOverrides">
    <div class="auth-layout">
      <div class="card auth-card auth-card-wide register-card">
        <div class="auth-logo">
          <div class="auth-logo-mark auth-logo-icon">
            <GitBranch aria-hidden="true" />
          </div>
          <h1>拜入 GitGame</h1>
          <p>择头像定形，持英雄帖入门</p>
        </div>

        <NForm class="register-form" label-placement="top" :show-require-mark="false">
          <NFormItem label="头像">
            <AvatarCropPicker @change="handleAvatarChange" />
          </NFormItem>

          <NFormItem label="昵称">
            <NInput
              v-model:value="displayName"
              maxlength="64"
              autocomplete="nickname"
              placeholder="你的修行名号"
            />
          </NFormItem>

          <NFormItem label="邮箱">
            <NInput
              v-model:value="email"
              type="text"
              autocomplete="email"
              placeholder="name@example.com"
            />
          </NFormItem>

          <NFormItem label="密码">
            <NInput
              v-model:value="password"
              type="password"
              autocomplete="new-password"
              show-password-on="click"
              placeholder="设置登录密码"
            />
          </NFormItem>

          <NFormItem label="英雄帖">
            <NInput
              v-model:value="heroInviteCode"
              maxlength="32"
              autocomplete="off"
              placeholder="输入邀请码"
            />
          </NFormItem>

          <NAlert v-if="error" type="error" :bordered="false" class="register-error">
            {{ error }}
          </NAlert>

          <NButton
            type="primary"
            block
            size="large"
            :loading="submitting"
            @click="handleSubmit"
          >
            注册
          </NButton>
        </NForm>

        <p class="auth-footer">
          已有账号？<RouterLink to="/login">登录</RouterLink>
        </p>
      </div>
    </div>
  </NConfigProvider>
</template>
