<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { attemptsApi, levelsApi } from "../api/client";
import CommitGraph from "../components/CommitGraph.vue";
import GoalFeedback from "../components/GoalFeedback.vue";
import WorkingTreePanel from "../components/WorkingTreePanel.vue";
import { usePointsStore } from "../stores/points";
import { useToastStore } from "../stores/toast";
import type { AttemptDetail, CommandResponse, LevelGoalHints, NextLevelAfterComplete, RepoState } from "../types";
import { EMPTY_LEVEL_GOAL_HINTS } from "../types";
import { calcChallengeProgress } from "../utils/challengeProgress";
import {
  allLevelsCompleteToast,
  badgeUnlockToast,
  levelCompleteToast,
  nextLevelUnlockToast,
} from "../utils/toastMessages";

const route = useRoute();
const router = useRouter();
/** 积分 Store，自动解锁下一关后刷新顶栏余额 */
const pointsStore = usePointsStore();
/** Toast Store，通关等正反馈弹窗 */
const toastStore = useToastStore();
/** 当前练习关卡 id，随路由参数变化 */
const levelId = computed(() => route.params.levelId as string);

/** 关卡标题 */
const levelTitle = ref("");
/** 关卡任务说明 */
const levelDescription = ref("");
/** 关卡分层提示 */
const goalHints = ref<LevelGoalHints>({ ...EMPTY_LEVEL_GOAL_HINTS });
/** 提示面板是否展开 */
const hintOpen = ref(false);
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
/** 是否为关卡未解锁错误 */
const lockedError = ref(false);
/** 命令输入框 DOM 引用，用于命令执行后恢复焦点 */
const commandInputRef = ref<HTMLInputElement | null>(null);
/** 终端输出区域 DOM 引用，用于命令执行后滚到底部 */
const terminalOutputRef = ref<HTMLDivElement | null>(null);
/** 通关后下一关信息，来自服务端（含自动解锁结果） */
const completedNextLevel = ref<NextLevelAfterComplete | null>(null);

/** 目标完成百分比，以开局差距为基准从 0% 起算 */
const progressPct = computed(() => {
  if (!judge.value) return 0;
  return calcChallengeProgress(
    judge.value,
    initialGapCount.value,
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

/**
 * 重置练习页全部状态。
 * 功能：切换关卡或重新进入练习前清空上一关残留数据。
 * 参数：无。
 * 返回值：无。
 */
const resetPracticeState = () => {
  levelTitle.value = "";
  levelDescription.value = "";
  goalHints.value = { ...EMPTY_LEVEL_GOAL_HINTS };
  hintOpen.value = false;
  attemptId.value = "";
  repoState.value = null;
  judge.value = null;
  initialGapCount.value = 0;
  initialSatisfiedKeys.value = [];
  terminalLines.value = [];
  commandInput.value = "";
  submitting.value = false;
  completed.value = false;
  stepCount.value = 0;
  error.value = "";
  lockedError.value = false;
  completedNextLevel.value = null;
};

/**
 * 加载并开启指定关卡的练习。
 * 功能：拉取关卡详情并创建新的 attempt 会话。
 * 参数：targetLevelId - 目标关卡 id。
 * 返回值：无。
 */
const initPracticeLevel = (targetLevelId: string) => {
  resetPracticeState();

  levelsApi.get(targetLevelId).then((level) => {
    levelTitle.value = level.title;
    levelDescription.value = level.description;
    goalHints.value = level.goalHints;
  }).catch((err: Error) => {
    if (err.message.includes("未解锁")) {
      lockedError.value = true;
    }
    error.value = err.message;
  });

  attemptsApi.create(targetLevelId).then((attempt) => {
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
    if (err.message.includes("未解锁")) {
      lockedError.value = true;
    }
    error.value = err.message;
  });
};

/**
 * 跳转到下一关练习页。
 * 功能：通关且下一关可开始时进入对应路由。
 * 参数：nextLevelInfo - 服务端返回的下一关摘要。
 * 返回值：无。
 */
const goNextLevel = (nextLevelInfo: NextLevelAfterComplete) => {
  router.push(`/practice/${nextLevelInfo.levelId}`);
};

/**
 * 通关后在终端提示下一关信息。
 * 功能：展示服务端返回的下一关状态，引导玩家手动点击「下一关」。
 * 参数：nextLevelInfo - 服务端下一关摘要，null 表示已全部通关。
 * 返回值：无。
 */
const appendNextLevelHint = (nextLevelInfo: NextLevelAfterComplete | null | undefined) => {
  if (!nextLevelInfo) {
    completedNextLevel.value = null;
    terminalLines.value.push({ text: "恭喜完成全部已发布关卡！", type: "success" });
    const allDoneToast = allLevelsCompleteToast();
    toastStore.success(allDoneToast.message, allDoneToast.emoji);
    scrollTerminalToBottom();
    return;
  }

  completedNextLevel.value = nextLevelInfo;

  if (nextLevelInfo.autoUnlocked) {
    terminalLines.value.push({
      text: `已自动解锁下一关：${nextLevelInfo.title}（消耗 ${nextLevelInfo.unlockCost} 积分），点击下方「下一关」继续`,
      type: "success",
    });
    const nextToast = nextLevelUnlockToast(nextLevelInfo.title);
    toastStore.info(nextToast.message, nextToast.emoji);
    pointsStore.loadWallet();
  } else if (nextLevelInfo.canStart) {
    terminalLines.value.push({
      text: `下一关：${nextLevelInfo.title}，点击下方「下一关」继续`,
      type: "success",
    });
  } else {
    terminalLines.value.push({
      text: `下一关：${nextLevelInfo.title}，积分不足（需 ${nextLevelInfo.unlockCost} 积分）`,
      type: "output",
    });
  }
  scrollTerminalToBottom();
};

/**
 * 判断当前关卡是否有任何提示内容。
 * 功能：控制顶栏提示按钮与面板的可用状态。
 * 参数：无。
 * 返回值：true 表示至少有一类提示非空。
 */
const hasAnyHints = computed(() => {
  const hints = goalHints.value;
  return (
    hints.concepts.length > 0
    || hints.directions.length > 0
    || hints.keyPoints.length > 0
    || hints.targets.length > 0
  );
});

/**
 * 切换提示面板显示状态。
 * 功能：点击顶栏「提示」时展开或收起目标提示。
 * 参数：无。
 * 返回值：无。
 */
const toggleHintPanel = () => {
  hintOpen.value = !hintOpen.value;
};

watch(
  levelId,
  (newLevelId) => {
    if (!newLevelId) {
      return;
    }
    initPracticeLevel(newLevelId);
  },
  { immediate: true },
);

/**
 * 将命令执行结果写入终端。
 * 功能：展示 output 与 feedback；二者文案相同时只输出一行，避免重复报错。
 * 参数：result - 命令提交响应。
 * 返回值：无。
 */
const appendCommandResult = (result: CommandResponse) => {
  /** 命令原始输出，去掉首尾空白后用于比较 */
  const outputText = result.output.trim();
  /** 系统反馈文案，去掉首尾空白后用于比较 */
  const feedbackText = result.feedback.trim();
  /** 结果行样式：成功为 output/success，失败为 error */
  const resultType = result.success ? (outputText ? "output" : "success") : "error";

  if (outputText) {
    terminalLines.value.push({ text: result.output, type: resultType });
  }

  if (feedbackText && feedbackText !== outputText) {
    terminalLines.value.push({
      text: result.feedback,
      type: result.success ? "success" : "error",
    });
  } else if (!outputText && feedbackText) {
    terminalLines.value.push({
      text: result.feedback,
      type: result.success ? "success" : "error",
    });
  }
};

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
      appendCommandResult(result);
      repoState.value = result.state;
      judge.value = result.judge;
      stepCount.value = result.stepCount;
      completed.value = result.completed;
      if (result.completed) {
        terminalLines.value.push({ text: `通关！得分: ${result.judge.score}`, type: "success" });
        const completeToast = levelCompleteToast(result.judge.score);
        toastStore.success(completeToast.message, completeToast.emoji);
        appendNextLevelHint(result.nextLevel);
      }
      if (result.newlyUnlockedBadges && result.newlyUnlockedBadges.length > 0) {
        const badgeCount = result.newlyUnlockedBadges.length;
        terminalLines.value.push({
          text: `解锁徽章 ${badgeCount} 枚，前往「徽章」页查看`,
          type: "success",
        });
        const badgeToast = badgeUnlockToast(badgeCount);
        toastStore.success(badgeToast.message, badgeToast.emoji);
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
        <h1 class="practice-title">{{ levelTitle || '练习' }}</h1>
      </div>
      <div v-if="judge" class="practice-meta">
        <div class="practice-hint-wrap">
          <button
            type="button"
            class="meta-chip practice-hint-trigger"
            :class="{ active: hintOpen }"
            :disabled="!hasAnyHints"
            @click="toggleHintPanel"
          >
            提示
          </button>
          <div v-if="hintOpen && hasAnyHints" class="practice-hint-panel card">
            <p class="practice-hint-panel-title">关卡提示</p>

            <section v-if="goalHints.concepts.length > 0" class="practice-hint-section">
              <h4 class="practice-hint-section-title">知识点</h4>
              <ul class="hint-list practice-hint-list">
                <li v-for="hint in goalHints.concepts" :key="`concept-${hint}`">{{ hint }}</li>
              </ul>
            </section>

            <section v-if="goalHints.directions.length > 0" class="practice-hint-section">
              <h4 class="practice-hint-section-title">解题方向</h4>
              <ul class="hint-list practice-hint-list">
                <li v-for="hint in goalHints.directions" :key="`direction-${hint}`">{{ hint }}</li>
              </ul>
            </section>

            <section v-if="goalHints.keyPoints.length > 0" class="practice-hint-section">
              <h4 class="practice-hint-section-title">关键点拨</h4>
              <ul class="hint-list practice-hint-list">
                <li v-for="hint in goalHints.keyPoints" :key="`key-${hint}`">{{ hint }}</li>
              </ul>
            </section>

            <section v-if="goalHints.targets.length > 0" class="practice-hint-section">
              <h4 class="practice-hint-section-title">通关目标</h4>
              <ul class="hint-list practice-hint-list practice-hint-target-list">
                <li v-for="hint in goalHints.targets" :key="`target-${hint}`">{{ hint }}</li>
              </ul>
            </section>
          </div>
        </div>
        <span class="meta-chip">步骤 {{ stepCount }}</span>
        <span class="meta-chip" :class="{ done: judge.passed }">
          {{ judge.passed ? '已通关' : `进度 ${progressPct}%` }}
        </span>
      </div>
    </header>

    <div v-if="lockedError" class="card practice-locked-card">
      <h2 class="practice-locked-title">关卡未解锁</h2>
      <p class="practice-locked-desc">请先前往关卡页消耗积分解锁，或完成每日签到积累积分。</p>
      <RouterLink to="/levels" class="btn-primary">返回关卡页</RouterLink>
    </div>

    <p v-else-if="error" class="error-msg practice-error">{{ error }}</p>

    <div v-if="repoState && judge" class="practice-layout">
      <div class="practice-sidebar">
        <div class="practice-sidebar-row">
          <div class="card practice-panel-compact">
            <p class="panel-title">提交图谱</p>
            <CommitGraph :state="repoState" />
          </div>
          <div class="card practice-panel-compact">
            <p class="panel-title">工作区</p>
            <WorkingTreePanel :state="repoState" />
          </div>
        </div>
        <div class="card practice-panel-goal">
          <p class="panel-title">目标反馈</p>
          <GoalFeedback
            :judge="judge"
            :task-description="levelDescription"
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
          <span class="terminal-chrome-title">Git 终端</span>
        </div>
        <div class="terminal-body">
          <div ref="terminalOutputRef" class="terminal dark-scroll dark-scroll--terminal">
            <div
              v-for="(line, i) in terminalLines"
              :key="i"
              class="terminal-line"
              :class="line.type"
            >{{ line.text }}</div>
          </div>
        </div>
        <div class="terminal-input-area" :class="{ 'is-completed': completed }">
          <div v-if="!completed" class="terminal-input-row">
            <span class="prompt-symbol">❯</span>
            <input
              ref="commandInputRef"
              v-model="commandInput"
              placeholder="git status"
              @keydown.enter="submitCommand"
            />
            <button class="btn-primary" :disabled="submitting" @click="submitCommand">
              执行
            </button>
          </div>
          <div v-else class="terminal-actions">
            <button
              v-if="completedNextLevel && completedNextLevel.canStart"
              type="button"
              class="btn-primary"
              @click="goNextLevel(completedNextLevel)"
            >
              下一关
            </button>
            <RouterLink
              v-else-if="completedNextLevel && !completedNextLevel.canStart"
              to="/levels"
              class="btn-primary"
            >
              去赚取积分
            </RouterLink>
            <button class="btn-success" @click="goReplay">查看复盘</button>
            <RouterLink to="/levels" class="btn-ghost">返回关卡</RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
