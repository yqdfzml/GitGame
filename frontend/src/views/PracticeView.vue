<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { attemptsApi, levelsApi } from "../api/client";
import CommitGraph from "../components/CommitGraph.vue";
import GoalFeedback from "../components/GoalFeedback.vue";
import WorkingTreePanel from "../components/WorkingTreePanel.vue";
import type { AttemptDetail, RepoState } from "../types";
import { calcChallengeProgress } from "../utils/challengeProgress";

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
/** 开局时的差距项数量，用于计算从 0% 开始的进度 */
const initialGapCount = ref(0);
/** 开局时已满足的条件 key */
const initialSatisfiedKeys = ref<string[]>([]);
/** 终端历史 */
const terminalLines = ref<Array<{ text: string; type: string }>>([]);
/** 命令输入 */
const commandInput = ref("");
/** 是否提交中 */
const submitting = ref(false);
/** 是否已通关 */
const completed = ref(false);
/** 当前步数 */
const stepCount = ref(0);
/** 错误信息 */
const error = ref("");
/** 命令输入框 DOM 引用，用于命令执行后恢复焦点 */
const commandInputRef = ref<HTMLInputElement | null>(null);
/** 终端输出区域 DOM 引用，用于命令执行后滚到底部 */
const terminalOutputRef = ref<HTMLDivElement | null>(null);

/** 目标完成百分比，以开局差距为基准从 0% 起算 */
const progressPct = computed(() => {
  if (!judge.value) return 0;
  return calcChallengeProgress(
    judge.value,
    initialGapCount.value,
    initialSatisfiedKeys.value,
  );
});

/**
 * 让命令输入框重新获得焦点。
 * 功能：在 DOM 更新完成后聚焦输入框，避免执行命令后失焦。
 * 参数：无。
 * 返回值：无。
 */
const focusCommandInput = () => {
  if (completed.value) return;
  nextTick(() => {
    // preventScroll 避免浏览器为聚焦而滚动页面，导致底部输入区被挤出视口
    commandInputRef.value?.focus({ preventScroll: true });
  });
};

/**
 * 将终端输出滚到最新一行。
 * 功能：命令执行后保持输出区停在底部，避免内容撑高外层布局。
 * 参数：无。
 * 返回值：无。
 */
const scrollTerminalToBottom = () => {
  nextTick(() => {
    const terminalEl = terminalOutputRef.value;
    if (!terminalEl) return;
    terminalEl.scrollTop = terminalEl.scrollHeight;
  });
};

onMounted(() => {
  levelsApi.get(levelId).then((level) => {
    levelTitle.value = level.title;
    goalHints.value = level.goalHints;
  });

  attemptsApi.create(levelId).then((attempt) => {
    attemptId.value = attempt.id;
    repoState.value = attempt.state;
    judge.value = attempt.judge;
    initialGapCount.value = attempt.judge.gaps.length;
    initialSatisfiedKeys.value = [...attempt.judge.satisfied];
    stepCount.value = attempt.stepCount;
    terminalLines.value.push({ text: "练习已开始。输入 git 命令并按 Enter 执行。", type: "success" });
    scrollTerminalToBottom();
    focusCommandInput();
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
      stepCount.value = result.stepCount;
      completed.value = result.completed;
      if (result.completed) {
        terminalLines.value.push({ text: `通关！得分: ${result.judge.score}`, type: "success" });
      }
      if (result.newlyUnlockedBadges && result.newlyUnlockedBadges.length > 0) {
        terminalLines.value.push({
          text: `解锁徽章 ${result.newlyUnlockedBadges.length} 枚，前往「徽章」页查看`,
          type: "success",
        });
      }
    })
    .catch((err: Error) => {
      terminalLines.value.push({ text: err.message, type: "error" });
    })
    .finally(() => {
      submitting.value = false;
      scrollTerminalToBottom();
      focusCommandInput();
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
  <div class="practice-page">
    <header class="practice-header">
      <div class="practice-header-main">
        <span class="page-eyebrow">Practice</span>
        <h1 class="practice-title">{{ levelTitle || '练习' }}</h1>
      </div>
      <div v-if="judge" class="practice-meta">
        <span class="meta-chip">步骤 {{ stepCount }}</span>
        <span class="meta-chip" :class="{ done: judge.passed }">
          {{ judge.passed ? '已通关' : `进度 ${progressPct}%` }}
        </span>
      </div>
    </header>

    <p v-if="error" class="error-msg practice-error">{{ error }}</p>

    <div v-if="completed && judge" class="success-banner practice-success-banner">
      <span class="success-banner-icon">✓</span>
      恭喜通关！得分 {{ judge.score }} 分
    </div>

    <div v-if="repoState && judge" class="practice-layout">
      <div class="practice-sidebar">
        <div class="practice-sidebar-row">
          <div class="card practice-panel-compact">
            <p class="panel-title">Commit Graph</p>
            <CommitGraph :state="repoState" />
          </div>
          <div class="card practice-panel-compact">
            <p class="panel-title">Working Tree</p>
            <WorkingTreePanel :state="repoState" />
          </div>
        </div>
        <div class="card practice-panel-goal">
          <p class="panel-title">目标反馈</p>
          <GoalFeedback
            :judge="judge"
            :goal-hints="goalHints"
            :progress-pct="progressPct"
            :initial-gap-count="initialGapCount"
            :initial-satisfied-keys="initialSatisfiedKeys"
          />
        </div>
      </div>

      <div class="card terminal-panel">
        <div class="terminal-chrome">
          <span class="terminal-dot red" />
          <span class="terminal-dot yellow" />
          <span class="terminal-dot green" />
          <span class="terminal-chrome-title">git — zsh</span>
        </div>
        <div ref="terminalOutputRef" class="terminal">
          <div
            v-for="(line, i) in terminalLines"
            :key="i"
            class="terminal-line"
            :class="line.type"
          >{{ line.text }}</div>
        </div>
        <div class="terminal-input-area">
          <div class="terminal-input-row">
            <span class="prompt-symbol">❯</span>
            <input
              ref="commandInputRef"
              v-model="commandInput"
              placeholder="git status"
              :disabled="completed"
              @keydown.enter="submitCommand"
            />
            <button class="btn-primary" :disabled="completed || submitting" @click="submitCommand">
              执行
            </button>
          </div>
          <div v-if="completed" class="terminal-actions">
            <button class="btn-success" @click="goReplay">查看复盘</button>
            <RouterLink to="/levels" class="btn-ghost">返回关卡</RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
