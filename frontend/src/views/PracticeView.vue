<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { attemptsApi, levelsApi } from "../api/client";
import CommitGraph from "../components/CommitGraph.vue";
import ConflictChoiceDialog from "../components/ConflictChoiceDialog.vue";
import ConflictVisualEditor from "../components/ConflictVisualEditor.vue";
import GoalFeedback from "../components/GoalFeedback.vue";
import MinimalVimEditor from "../components/MinimalVimEditor.vue";
import WorkingTreePanel from "../components/WorkingTreePanel.vue";
import { usePointsStore } from "../stores/points";
import { useToastStore } from "../stores/toast";
import type { AttemptDetail, CommandResponse, LevelGoalHints, NextLevelAfterComplete, RepoState } from "../types";
import { EMPTY_LEVEL_GOAL_HINTS } from "../types";
import {
  buildHistorySuggestionSuffix,
  findHistorySuggestion,
  pushCommandHistory,
} from "../utils/commandHistorySuggestion";
import {
  buildTerminalLinesFromCommands,
  extractCommandHistory,
  appendCommandEntryLines,
} from "../utils/terminalLines";
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
/** 是否正在清空步骤 */
const resettingSteps = ref(false);
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
/** 本会话已执行命令历史（旧到新） */
const commandHistory = ref<string[]>([]);
/** 上下键翻历史时的游标，-1 表示正在正常输入 */
const historyBrowseIndex = ref(-1);
/** 开始翻历史前暂存的输入，用于按 Down 回到最新位置时恢复 */
const historyDraftInput = ref("");
/** 程序改写输入框时，避免 input 事件重置翻历史状态 */
const suppressHistoryBrowseReset = ref(false);
/** 已提示过的冲突文件路径，用于检测新冲突 */
const knownConflictPaths = ref<string[]>([]);
/** 是否显示冲突解决方式选择弹窗 */
const showConflictChoice = ref(false);
/** 当前打开的冲突编辑器类型 */
const conflictEditorMode = ref<"vim" | "visual" | null>(null);
/** 是否显示冲突编辑器（Vim 或可视化） */
const showConflictEditor = ref(false);
/** 正在编辑的冲突文件路径 */
const editingConflictPath = ref("");

/** 目标完成百分比，以开局差距为基准从 0% 起算 */
const progressPct = computed(() => {
  if (!judge.value) return 0;
  return calcChallengeProgress(
    judge.value,
    initialGapCount.value,
  );
});

/** 当前输入匹配到的历史命令建议 */
const historySuggestion = computed(() => {
  if (historyBrowseIndex.value >= 0) {
    return null;
  }
  return findHistorySuggestion(commandInput.value, commandHistory.value);
});

/** 历史建议的灰色幽灵后缀 */
const historySuggestionSuffix = computed(() => {
  return buildHistorySuggestionSuffix(commandInput.value, historySuggestion.value);
});

/** 当前仓库中的冲突文件路径列表 */
const currentConflictPaths = computed(() => {
  if (!repoState.value) {
    return [];
  }
  return Object.keys(repoState.value.conflicts);
});

/** 正在编辑文件的工作区全文 */
const editingConflictContent = computed(() => {
  if (!repoState.value || !editingConflictPath.value) {
    return "";
  }
  return repoState.value.workingTree[editingConflictPath.value]?.content ?? "";
});

/** 正在编辑文件的冲突元信息 */
const editingConflictMeta = computed(() => {
  if (!repoState.value || !editingConflictPath.value) {
    return null;
  }
  return repoState.value.conflicts[editingConflictPath.value] ?? null;
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
  commandHistory.value = [];
  historyBrowseIndex.value = -1;
  historyDraftInput.value = "";
  knownConflictPaths.value = [];
  showConflictChoice.value = false;
  conflictEditorMode.value = null;
  showConflictEditor.value = false;
  editingConflictPath.value = "";
};

/**
 * 把服务端 attempt 会话应用到练习页。
 * 功能：刷新后恢复仓库状态、终端输出、进度与命令历史。
 * 参数：attempt - 服务端返回的会话详情。
 * 返回值：无。
 */
const applyAttemptSession = (attempt: AttemptDetail) => {
  const isCompleted = attempt.status === "COMPLETED";
  const isResumed = attempt.stepCount > 0;

  attemptId.value = attempt.id;
  repoState.value = attempt.state;
  judge.value = attempt.judge;
  initialGapCount.value = attempt.initialGapCount;
  initialSatisfiedKeys.value = [...attempt.initialSatisfiedKeys];
  stepCount.value = attempt.stepCount;
  completed.value = isCompleted;
  terminalLines.value = buildTerminalLinesFromCommands(attempt.commands, {
    resumed: isResumed,
    completed: isCompleted,
    score: isCompleted ? attempt.judge.score : undefined,
  });
  commandHistory.value = extractCommandHistory(attempt.commands);
  historyBrowseIndex.value = -1;
  historyDraftInput.value = "";
  commandInput.value = "";
  syncConflictPrompt(attempt.state, { onResume: true });
};

/**
 * 获取仓库状态中的冲突文件路径。
 * 功能：统一从 repoState 读取 conflicts 键列表。
 * 参数：state - 仓库快照。
 * 返回值：冲突文件路径数组。
 */
const getConflictPaths = (state: RepoState | null): string[] => {
  if (!state) {
    return [];
  }
  return Object.keys(state.conflicts);
};

/**
 * 根据仓库状态决定是否弹出冲突解决方式选择框。
 * 功能：新出现冲突或恢复会话时提示玩家选择 Vim / 可视化编辑器。
 * 参数：state - 最新仓库快照；options.onResume - 是否为恢复会话。
 * 返回值：无。
 */
const syncConflictPrompt = (
  state: RepoState | null,
  options?: { onResume?: boolean },
) => {
  const paths = getConflictPaths(state);
  if (paths.length === 0) {
    knownConflictPaths.value = [];
    showConflictChoice.value = false;
    return;
  }

  const hasNewConflict = paths.some((path) => !knownConflictPaths.value.includes(path));
  if (options?.onResume || hasNewConflict) {
    knownConflictPaths.value = paths;
    showConflictChoice.value = true;
  }
};

/**
 * 打开指定冲突文件的编辑器。
 * 功能：按玩家选择启动 Vim 或可视化编辑界面。
 * 参数：mode - 编辑模式；path - 可选，默认取第一个冲突文件。
 * 返回值：无。
 */
const openConflictEditor = (mode: "vim" | "visual", path?: string) => {
  const paths = getConflictPaths(repoState.value);
  const targetPath = path ?? paths[0];
  if (!targetPath) {
    return;
  }
  editingConflictPath.value = targetPath;
  conflictEditorMode.value = mode;
  showConflictEditor.value = true;
};

/**
 * 玩家从弹窗选择冲突解决方式。
 * 功能：关闭选择框并打开对应编辑器。
 * 参数：mode - vim 或 visual。
 * 返回值：无。
 */
const handleConflictChoice = (mode: "vim" | "visual") => {
  openConflictEditor(mode);
};

/**
 * 玩家点击工作区冲突文件时再次选择编辑方式。
 * 功能：若尚未选择过模式则弹窗，否则沿用上次的编辑器。
 * 参数：path - 被点击的文件路径。
 * 返回值：无。
 */
const handleConflictFileClick = (path: string) => {
  if (conflictEditorMode.value) {
    openConflictEditor(conflictEditorMode.value, path);
    return;
  }
  editingConflictPath.value = path;
  showConflictChoice.value = true;
};

/**
 * 将命令执行后的通关、徽章等副作用写入界面。
 * 功能：submitCommand 与 resolveConflict 共用。
 * 参数：result - 服务端返回的执行结果。
 * 返回值：无。
 */
const applyCommandSideEffects = (result: CommandResponse) => {
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
  syncConflictPrompt(result.state);
};

/**
 * 保存冲突文件编辑结果。
 * 功能：调用 resolve-conflict API 并刷新仓库状态。
 * 参数：content - 玩家编辑后的文件全文。
 * 返回值：无。
 */
const saveConflictContent = (content: string) => {
  if (!attemptId.value || !editingConflictPath.value || submitting.value) {
    return;
  }

  const path = editingConflictPath.value;
  submitting.value = true;
  showConflictEditor.value = false;
  terminalLines.value.push({ text: `$ edit ${path}`, type: "output" });

  attemptsApi.resolveConflict(attemptId.value, path, content)
    .then((result) => {
      appendCommandResult(result);
      applyCommandSideEffects(result);

      const remainingPaths = getConflictPaths(result.state);
      if (remainingPaths.length > 0) {
        knownConflictPaths.value = remainingPaths;
        showConflictChoice.value = true;
      }
    })
    .catch((err: Error) => {
      terminalLines.value.push({ text: err.message, type: "error" });
      showConflictEditor.value = true;
    })
    .finally(() => {
      submitting.value = false;
      scrollTerminalToBottom();
      focusCommandInput();
    });
};

/**
 * 加载并开启指定关卡的练习。
 * 功能：拉取关卡详情并创建或恢复 attempt 会话。
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
    applyAttemptSession(attempt);
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
  appendCommandEntryLines(terminalLines.value, {
    stepIndex: stepCount.value,
    command: "",
    success: result.success,
    feedback: result.feedback,
    output: result.output,
  });
};

/**
 * 接受当前历史幽灵建议。
 * 功能：把输入框内容补全为完整历史命令。
 * 参数：无。
 * 返回值：无。
 */
const acceptHistorySuggestion = () => {
  if (!historySuggestion.value) {
    return;
  }
  suppressHistoryBrowseReset.value = true;
  commandInput.value = historySuggestion.value;
  nextTick(() => {
    suppressHistoryBrowseReset.value = false;
    const inputEl = commandInputRef.value;
    if (!inputEl) {
      return;
    }
    const end = inputEl.value.length;
    inputEl.setSelectionRange(end, end);
    focusCommandInput();
  });
};

/**
 * 判断光标是否在输入框末尾。
 * 功能：只有光标在末尾时才接受幽灵建议，避免打断中间编辑。
 * 参数：inputEl - 输入框元素。
 * 返回值：true 表示光标在末尾。
 */
const isCursorAtInputEnd = (inputEl: HTMLInputElement): boolean => {
  return inputEl.selectionStart === inputEl.value.length
    && inputEl.selectionEnd === inputEl.value.length;
};

/**
 * 向上翻阅更早的历史命令。
 * 功能：模拟终端按 Up 查看上一条命令。
 * 参数：无。
 * 返回值：无。
 */
const browseHistoryOlder = () => {
  if (commandHistory.value.length === 0) {
    return;
  }

  suppressHistoryBrowseReset.value = true;
  if (historyBrowseIndex.value < 0) {
    historyDraftInput.value = commandInput.value;
    historyBrowseIndex.value = commandHistory.value.length - 1;
  } else if (historyBrowseIndex.value > 0) {
    historyBrowseIndex.value -= 1;
  }
  commandInput.value = commandHistory.value[historyBrowseIndex.value];
  nextTick(() => {
    suppressHistoryBrowseReset.value = false;
    focusCommandInput();
  });
};

/**
 * 向下翻阅更新的历史命令。
 * 功能：模拟终端按 Down 回到较新的命令或恢复原始输入。
 * 参数：无。
 * 返回值：无。
 */
const browseHistoryNewer = () => {
  if (historyBrowseIndex.value < 0) {
    return;
  }

  suppressHistoryBrowseReset.value = true;
  if (historyBrowseIndex.value >= commandHistory.value.length - 1) {
    historyBrowseIndex.value = -1;
    commandInput.value = historyDraftInput.value;
    historyDraftInput.value = "";
  } else {
    historyBrowseIndex.value += 1;
    commandInput.value = commandHistory.value[historyBrowseIndex.value];
  }
  nextTick(() => {
    suppressHistoryBrowseReset.value = false;
    focusCommandInput();
  });
};

/**
 * 处理输入框内容变化。
 * 功能：用户手动输入时退出历史翻阅模式。
 * 参数：无。
 * 返回值：无。
 */
const handleCommandInput = () => {
  if (suppressHistoryBrowseReset.value) {
    return;
  }
  historyBrowseIndex.value = -1;
  historyDraftInput.value = "";
};

/**
 * 处理命令输入框键盘事件。
 * 功能：历史幽灵建议、上下翻历史、执行命令。
 * 参数：event - 键盘事件。
 * 返回值：无。
 */
const handleCommandKeydown = (event: KeyboardEvent) => {
  const inputEl = commandInputRef.value;

  if (
    (event.key === "ArrowRight" || event.key === "End" || event.key === "Tab")
    && historySuggestionSuffix.value
    && inputEl
    && isCursorAtInputEnd(inputEl)
  ) {
    event.preventDefault();
    acceptHistorySuggestion();
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    browseHistoryOlder();
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    browseHistoryNewer();
    return;
  }

  if (event.key === "Enter") {
    submitCommand();
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

  /** vim 命令：本地打开极简编辑器，不消耗步数 */
  const vimMatch = cmd.match(/^vim\s+(\S+)$/);
  if (vimMatch) {
    const filePath = vimMatch[1];
    if (repoState.value?.conflicts[filePath]) {
      commandHistory.value = pushCommandHistory(commandHistory.value, cmd);
      historyBrowseIndex.value = -1;
      historyDraftInput.value = "";
      terminalLines.value.push({ text: `$ ${cmd}`, type: "output" });
      terminalLines.value.push({ text: `进入 Vim 编辑 ${filePath}（:wq 保存，:q! 放弃）`, type: "output" });
      commandInput.value = "";
      openConflictEditor("vim", filePath);
      scrollTerminalToBottom();
      return;
    }
  }

  submitting.value = true;
  commandHistory.value = pushCommandHistory(commandHistory.value, cmd);
  historyBrowseIndex.value = -1;
  historyDraftInput.value = "";
  terminalLines.value.push({ text: `$ ${cmd}`, type: "output" });
  commandInput.value = "";

  attemptsApi.submitCommand(attemptId.value, cmd)
    .then((result) => {
      appendCommandResult(result);
      applyCommandSideEffects(result);
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
 * 将练习重置到开局状态。
 * 功能：清空终端历史、命令记录与仓库变更，从初始快照重新开始。
 * 参数：无。
 * 返回值：无。
 */
const resetAttemptSteps = () => {
  if (!attemptId.value || submitting.value || resettingSteps.value || completed.value) {
    return;
  }
  if (stepCount.value === 0) {
    return;
  }

  const confirmed = window.confirm(
    "确定清空本关已执行的全部命令？仓库将恢复到开局状态，此操作不可撤销。",
  );
  if (!confirmed) {
    return;
  }

  resettingSteps.value = true;
  showConflictChoice.value = false;
  showConflictEditor.value = false;
  conflictEditorMode.value = null;
  editingConflictPath.value = "";
  knownConflictPaths.value = [];

  attemptsApi.resetSteps(attemptId.value)
    .then((attempt) => {
      applyAttemptSession(attempt);
      terminalLines.value.push({ text: "已清空步骤，仓库已恢复为开局状态", type: "success" });
      scrollTerminalToBottom();
      focusCommandInput();
    })
    .catch((err: Error) => {
      terminalLines.value.push({ text: err.message, type: "error" });
      scrollTerminalToBottom();
    })
    .finally(() => {
      resettingSteps.value = false;
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
    <div v-if="lockedError" class="card practice-locked-card">
      <h2 class="practice-locked-title">{{ levelTitle || '练习' }} · 关卡未解锁</h2>
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
            <WorkingTreePanel :state="repoState" @edit-conflict="handleConflictFileClick" />
          </div>
        </div>
        <div class="card practice-panel-goal">
          <p class="panel-title">目标反馈</p>
          <div class="goal-feedback-body">
            <GoalFeedback
              :judge="judge"
              :task-description="levelDescription"
              :goal-targets="goalHints.targets"
              :progress-pct="progressPct"
              :initial-gap-count="initialGapCount"
              :initial-satisfied-keys="initialSatisfiedKeys"
            />
          </div>
        </div>
      </div>

      <div class="card terminal-panel practice-terminal-wrap">
        <div class="terminal-chrome">
          <span class="terminal-dot red" />
          <span class="terminal-dot yellow" />
          <span class="terminal-dot green" />
          <h1 class="terminal-chrome-title">{{ levelTitle || '练习' }}</h1>
          <div class="terminal-chrome-meta">
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
            <button
              v-if="!completed && stepCount > 0"
              type="button"
              class="meta-chip practice-reset-steps"
              :disabled="submitting || resettingSteps"
              @click="resetAttemptSteps"
            >
              {{ resettingSteps ? '清空中…' : '清空步骤' }}
            </button>
            <span class="meta-chip" :class="{ done: judge.passed }">
              {{ judge.passed ? '已通关' : `进度 ${progressPct}%` }}
            </span>
          </div>
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
            <div class="terminal-input-shell">
              <div class="terminal-input-ghost" aria-hidden="true">
                <span class="ghost-typed">{{ commandInput }}</span><span class="ghost-suffix">{{ historySuggestionSuffix }}</span>
              </div>
              <input
                ref="commandInputRef"
                v-model="commandInput"
                class="terminal-input-field"
                placeholder="git status"
                @keydown="handleCommandKeydown"
                @input="handleCommandInput"
              />
            </div>
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

        <MinimalVimEditor
          v-if="conflictEditorMode === 'vim'"
          v-model:show="showConflictEditor"
          :path="editingConflictPath"
          :content="editingConflictContent"
          @save="saveConflictContent"
        />
      </div>
    </div>

    <ConflictChoiceDialog
      v-model:show="showConflictChoice"
      :conflict-paths="currentConflictPaths"
      @choose="handleConflictChoice"
    />

    <ConflictVisualEditor
      v-if="conflictEditorMode === 'visual'"
      v-model:show="showConflictEditor"
      :path="editingConflictPath"
      :content="editingConflictContent"
      :conflict="editingConflictMeta"
      @save="saveConflictContent"
    />
  </div>
</template>
