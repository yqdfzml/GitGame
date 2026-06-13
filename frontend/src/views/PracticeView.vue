<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { attemptsApi, levelsApi } from "../api/client";
import CommitGraph from "../components/CommitGraph.vue";
import GoalFeedback from "../components/GoalFeedback.vue";
import WorkingTreePanel from "../components/WorkingTreePanel.vue";
import type { AttemptDetail, RepoState } from "../types";

const route = useRoute();
const router = useRouter();
const levelId = route.params.levelId as string;

/** 关卡标题 */
const levelTitle = ref("");
/** 目标提示 */
const goalHints = ref<string[]>([]);
/** 当前 attempt id */
const attemptId = ref("");
/** 当前仓库状态 */
const repoState = ref<RepoState | null>(null);
/** 判题结果 */
const judge = ref<AttemptDetail["judge"] | null>(null);
/** 终端历史 */
const terminalLines = ref<Array<{ text: string; type: string }>>([]);
/** 命令输入 */
const commandInput = ref("");
/** 是否提交中 */
const submitting = ref(false);
/** 是否已通关 */
const completed = ref(false);
/** 错误信息 */
const error = ref("");

onMounted(() => {
  levelsApi.get(levelId).then((level) => {
    levelTitle.value = level.title;
    goalHints.value = level.goalHints;
  });

  attemptsApi.create(levelId).then((attempt) => {
    attemptId.value = attempt.id;
    repoState.value = attempt.state;
    judge.value = attempt.judge;
    terminalLines.value.push({ text: "练习已开始。输入 git 命令并按 Enter 执行。", type: "success" });
  }).catch((err: Error) => {
    error.value = err.message;
  });
});

/**
 * 提交 Git 命令。
 * 功能：调用 API 执行命令并刷新 UI。
 * 参数：无（读取 commandInput）。
 * 返回值：无。
 */
const submitCommand = () => {
  const cmd = commandInput.value.trim();
  if (!cmd || !attemptId.value || submitting.value) return;

  submitting.value = true;
  terminalLines.value.push({ text: `$ ${cmd}`, type: "output" });
  commandInput.value = "";

  attemptsApi.submitCommand(attemptId.value, cmd)
    .then((result) => {
      if (result.output) {
        terminalLines.value.push({ text: result.output, type: result.success ? "output" : "error" });
      }
      terminalLines.value.push({
        text: result.feedback,
        type: result.success ? "success" : "error",
      });
      repoState.value = result.state;
      judge.value = result.judge;
      completed.value = result.completed;
      if (result.completed) {
        terminalLines.value.push({ text: `通关！得分: ${result.judge.score}`, type: "success" });
      }
    })
    .catch((err: Error) => {
      terminalLines.value.push({ text: err.message, type: "error" });
    })
    .finally(() => {
      submitting.value = false;
    });
};

/**
 * 跳转复盘页。
 * 功能：通关后查看命令历史。
 * 参数：无。
 * 返回值：无。
 */
const goReplay = () => {
  router.push(`/replay/${attemptId.value}`);
};
</script>

<template>
  <div>
    <h1 class="page-title">{{ levelTitle || '练习' }}</h1>
    <p v-if="error" class="error-msg">{{ error }}</p>

    <div v-if="repoState && judge" class="practice-layout">
      <div class="card">
        <p class="panel-title">终端</p>
        <div class="terminal">
          <div
            v-for="(line, i) in terminalLines"
            :key="i"
            class="terminal-line"
            :class="line.type"
          >{{ line.text }}</div>
        </div>
        <div class="terminal-input-row">
          <input
            v-model="commandInput"
            placeholder="git status"
            :disabled="completed || submitting"
            @keydown.enter="submitCommand"
          />
          <button class="btn-primary" :disabled="completed || submitting" @click="submitCommand">
            执行
          </button>
        </div>
        <button
          v-if="completed"
          class="btn-primary"
          style="margin-top:12px"
          @click="goReplay"
        >查看复盘</button>
      </div>

      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="card">
          <p class="panel-title">Commit Graph</p>
          <CommitGraph :state="repoState" />
        </div>
        <div class="card">
          <p class="panel-title">Working Tree / Staging</p>
          <WorkingTreePanel :state="repoState" />
        </div>
        <div class="card">
          <p class="panel-title">目标反馈</p>
          <GoalFeedback :judge="judge" :goal-hints="goalHints" />
        </div>
      </div>
    </div>
  </div>
</template>
