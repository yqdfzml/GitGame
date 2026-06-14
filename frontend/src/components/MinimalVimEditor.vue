<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";

/**
 * 极简 Vim 冲突编辑器。
 * 功能：在练习终端内模拟 Vim 的基本编辑流程。
 */

const props = defineProps<{
  /** 是否显示 Vim 覆盖层 */
  show: boolean;
  /** 正在编辑的文件路径 */
  path: string;
  /** 打开时的工作区全文（含冲突标记） */
  content: string;
}>();

const emit = defineEmits<{
  /** 更新显示状态 */
  "update:show": [value: boolean];
  /** 保存并退出（:wq） */
  save: [content: string];
}>();

/** Vim 模式：normal 普通 / insert 插入 / command 命令行 */
type VimMode = "normal" | "insert" | "command";

/** 当前 Vim 模式 */
const vimMode = ref<VimMode>("normal");
/** 编辑中的文件草稿 */
const draftContent = ref("");
/** 命令行缓冲（输入 : 后显示） */
const commandBuffer = ref("");
/** 底部状态提示 */
const statusMessage = ref("");
/** 插入模式用的 textarea DOM */
const insertAreaRef = ref<HTMLTextAreaElement | null>(null);
/** 命令行 input DOM */
const commandInputRef = ref<HTMLInputElement | null>(null);
/** 普通模式视图 DOM，用于自动聚焦接收快捷键 */
const normalViewRef = ref<HTMLDivElement | null>(null);

/** 底部状态栏左侧文案 */
const modeLabel = computed(() => {
  if (vimMode.value === "insert") {
    return "-- INSERT --";
  }
  if (vimMode.value === "command") {
    return ":" + commandBuffer.value;
  }
  return "-- NORMAL --";
});

/**
 * 打开 Vim 时重置内部状态。
 * 功能：同步文件内容并回到普通模式。
 * 参数：无（监听 props.show）。
 * 返回值：无。
 */
watch(
  () => props.show,
  (visible) => {
    if (!visible) {
      return;
    }
    draftContent.value = props.content;
    vimMode.value = "normal";
    commandBuffer.value = "";
    statusMessage.value = "按 i 进入编辑，:wq 保存，:q! 放弃";
    nextTick(() => {
      normalViewRef.value?.focus();
    });
  },
);

/**
 * 进入插入模式。
 * 功能：普通模式下按 i 后可编辑文本。
 * 参数：无。
 * 返回值：无。
 */
const enterInsertMode = () => {
  vimMode.value = "insert";
  statusMessage.value = "按 Esc 返回普通模式";
  nextTick(() => {
    insertAreaRef.value?.focus();
  });
};

/**
 * 进入命令行模式。
 * 功能：普通模式下按 : 后输入 wq / q! 等命令。
 * 参数：无。
 * 返回值：无。
 */
const enterCommandMode = () => {
  vimMode.value = "command";
  commandBuffer.value = "";
  statusMessage.value = "输入 wq 保存退出，q! 放弃退出";
  nextTick(() => {
    commandInputRef.value?.focus();
  });
};

/**
 * 返回普通模式。
 * 功能：Esc 或命令执行后回到 NORMAL。
 * 参数：无。
 * 返回值：无。
 */
const enterNormalMode = () => {
  vimMode.value = "normal";
  commandBuffer.value = "";
  statusMessage.value = "按 i 进入编辑，:wq 保存，:q! 放弃";
};

/**
 * 执行 Vim 命令行指令。
 * 功能：解析 wq / q / q! 并保存或退出。
 * 参数：raw - 命令行文本（不含冒号）。
 * 返回值：无。
 */
const runCommand = (raw: string) => {
  const cmd = raw.trim();
  if (cmd === "wq" || cmd === "x") {
    if (
      draftContent.value.includes("<<<<<<<")
      || draftContent.value.includes("=======")
      || draftContent.value.includes(">>>>>>>")
    ) {
      statusMessage.value = "仍有冲突标记，请继续编辑后 :wq";
      enterNormalMode();
      return;
    }
    emit("save", draftContent.value);
    emit("update:show", false);
    return;
  }
  if (cmd === "q!" || cmd === "qa!") {
    emit("update:show", false);
    return;
  }
  if (cmd === "q") {
    statusMessage.value = "有未保存修改，请用 :wq 保存或 :q! 放弃";
    enterNormalMode();
    return;
  }
  statusMessage.value = `未知命令: ${cmd}`;
  enterNormalMode();
};

/**
 * 处理普通模式键盘事件。
 * 功能：拦截 i 和 : 快捷键。
 * 参数：event - 键盘事件。
 * 返回值：无。
 */
const handleNormalKeydown = (event: KeyboardEvent) => {
  if (event.key === "i") {
    event.preventDefault();
    enterInsertMode();
    return;
  }
  if (event.key === ":") {
    event.preventDefault();
    enterCommandMode();
  }
};

/**
 * 处理插入模式 Esc。
 * 功能：从 INSERT 回到 NORMAL。
 * 参数：event - 键盘事件。
 * 返回值：无。
 */
const handleInsertKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    event.preventDefault();
    enterNormalMode();
  }
};

/**
 * 处理命令行回车。
 * 功能：提交 :wq 等命令。
 * 参数：event - 键盘事件。
 * 返回值：无。
 */
const handleCommandKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    event.preventDefault();
    enterNormalMode();
    return;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    runCommand(commandBuffer.value);
  }
};

/**
 * 点击遮罩关闭 Vim（等同 :q!）。
 * 功能：放弃修改并关闭覆盖层。
 * 参数：无。
 * 返回值：无。
 */
const cancelVim = () => {
  emit("update:show", false);
};
</script>

<template>
  <div v-if="show" class="vim-editor-overlay">
    <div class="vim-editor" @click.stop>
      <div class="vim-editor-header">
        <span class="vim-editor-label">VIM</span>
        <span class="vim-editor-path">{{ path }}</span>
        <button type="button" class="vim-editor-close" @click="cancelVim">×</button>
      </div>

      <div
        v-if="vimMode === 'normal'"
        ref="normalViewRef"
        class="vim-editor-view dark-scroll"
        tabindex="0"
        @keydown="handleNormalKeydown"
      >
        <pre class="vim-editor-content">{{ draftContent }}</pre>
      </div>

      <textarea
        v-else-if="vimMode === 'insert'"
        ref="insertAreaRef"
        v-model="draftContent"
        class="vim-editor-textarea dark-scroll"
        spellcheck="false"
        @keydown="handleInsertKeydown"
      />

      <div v-else class="vim-editor-view dark-scroll">
        <pre class="vim-editor-content">{{ draftContent }}</pre>
      </div>

      <div class="vim-editor-statusbar">
        <span class="vim-editor-mode">{{ modeLabel }}</span>
        <span class="vim-editor-status-msg">{{ statusMessage }}</span>
      </div>

      <input
        v-if="vimMode === 'command'"
        ref="commandInputRef"
        v-model="commandBuffer"
        class="vim-editor-command-input"
        @keydown="handleCommandKeydown"
      />
    </div>
  </div>
</template>
