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
    <header class="page-header">
      <h1 class="page-title">通关复盘</h1>
      <p class="page-desc">回顾本次练习的全部命令历史</p>
    </header>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner" />
      <span>加载中...</span>
    </div>

    <p v-if="error" class="error-msg">{{ error }}</p>

    <div v-if="!loading && !error" class="card">
      <div class="table-wrap">
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
              <td class="mono">{{ cmd.stepIndex }}</td>
              <td class="replay-cmd">{{ cmd.command }}</td>
              <td>
                <span class="result-tag" :class="cmd.success ? 'ok' : 'fail'">
                  {{ cmd.success ? '成功' : '失败' }}
                </span>
              </td>
              <td>{{ cmd.feedback }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="table-footer">
        <RouterLink to="/levels" class="btn-ghost">返回关卡</RouterLink>
      </div>
    </div>
  </div>
</template>
