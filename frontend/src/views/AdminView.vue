<script setup lang="ts">
import { ref } from "vue";

/** 新建关卡 JSON 模板 */
const levelJson = ref(JSON.stringify({
  courseId: "custom",
  chapterId: "demo",
  title: "自定义关卡",
  description: "描述",
  difficulty: "BEGINNER",
  sortOrder: 99,
  initialState: {
    commits: {},
    branches: {},
    head: { type: "branch", ref: "main" },
    workingTree: {},
    index: {},
    conflicts: {},
  },
  goal: { workingTreeClean: true },
  constraints: { baseScore: 100, stepPenalty: 2 },
}, null, 2));

/** 操作反馈 */
const message = ref("");
/** 是否错误 */
const isError = ref(false);

/**
 * 创建并发布关卡（演示）。
 * 功能：调用管理 API 创建草稿并发布。
 * 参数：无。
 * 返回值：无。
 */
const createAndPublish = () => {
  message.value = "";
  import("../api/client").then(({ adminApi }) => {
    const data = JSON.parse(levelJson.value) as Record<string, unknown>;
    adminApi.createLevel(data)
      .then((result) => adminApi.publishLevel(result.id))
      .then(() => {
        message.value = "关卡已创建并发布";
        isError.value = false;
      })
      .catch((err: Error) => {
        message.value = err.message;
        isError.value = true;
      });
  });
};
</script>

<template>
  <div>
    <header class="page-header">
      <span class="page-eyebrow">Admin</span>
      <h1 class="page-title">管理后台</h1>
      <p class="page-desc">创建、编辑和发布关卡（需管理员权限）</p>
    </header>

    <div class="card">
      <p class="panel-title">新建关卡 JSON</p>
      <div class="form-group">
        <textarea v-model="levelJson" rows="20" />
      </div>
      <button class="btn-primary" @click="createAndPublish">创建并发布</button>
      <p v-if="message" :class="isError ? 'error-msg' : 'success-msg'" style="margin-top:12px">{{ message }}</p>
    </div>
  </div>
</template>
