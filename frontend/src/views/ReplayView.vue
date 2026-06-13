<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { attemptsApi } from "../api/client";

const route = useRoute();
const attemptId = route.params.attemptId as string;

/** 命令历史 */
const commands = ref<Array<{ stepIndex: number; command: string; success: boolean; feedback: string | null }>>([]);
/** 加载中 */
const loading = ref(true);
/** 错误信息 */
const error = ref("");

onMounted(() => {
  attemptsApi.replay(attemptId)
    .then((data) => {
      commands.value = data.commands;
    })
    .catch((err: Error) => {
      error.value = err.message;
    })
    .finally(() => {
      loading.value = false;
    });
});
</script>

<template>
  <div>
    <h1 class="page-title">通关复盘</h1>
    <p class="page-desc">回顾本次练习的全部命令历史</p>

    <p v-if="loading">加载中...</p>
    <p v-if="error" class="error-msg">{{ error }}</p>

    <div v-if="!loading && !error" class="card">
      <table class="table">
        <thead>
          <tr>
            <th>步骤</th>
            <th>命令</th>
            <th>结果</th>
            <th>反馈</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="cmd in commands" :key="cmd.stepIndex">
            <td>{{ cmd.stepIndex }}</td>
            <td style="font-family:var(--font-mono);font-size:0.85rem">{{ cmd.command }}</td>
            <td>{{ cmd.success ? '成功' : '失败' }}</td>
            <td>{{ cmd.feedback }}</td>
          </tr>
        </tbody>
      </table>
      <RouterLink to="/levels" class="btn-ghost" style="margin-top:16px;display:inline-block">返回关卡</RouterLink>
    </div>
  </div>
</template>
