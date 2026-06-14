<script setup lang="ts">
/**
 * 冲突解决方式选择弹窗。
 * 功能：合并冲突后强制玩家选择极简 Vim 或可视化编辑器，不可跳过。
 */

defineProps<{
  /** 是否显示弹窗 */
  show: boolean;
  /** 当前冲突文件路径列表 */
  conflictPaths: string[];
}>();

const emit = defineEmits<{
  /** 更新显示状态 */
  "update:show": [value: boolean];
  /** 玩家选择编辑方式 */
  choose: [mode: "vim" | "visual"];
}>();

/**
 * 关闭选择弹窗。
 * 功能：不打开编辑器，让玩家回到练习页继续操作（如清空步骤）。
 * 参数：无。
 * 返回值：无。
 */
const closeDialog = () => {
  emit("update:show", false);
};

/**
 * 确认编辑方式并打开对应编辑器。
 * 功能：向父组件传递 vim 或 visual 选择后关闭弹窗。
 * 参数：mode - 玩家选中的编辑模式。
 * 返回值：无。
 */
const pickMode = (mode: "vim" | "visual") => {
  emit("choose", mode);
  emit("update:show", false);
};
</script>

<template>
  <div v-if="show" class="conflict-dialog-overlay">
    <div class="conflict-dialog card">
      <div class="conflict-dialog-head">
        <h2 class="conflict-dialog-title">需要解决冲突</h2>
        <button type="button" class="conflict-dialog-close" aria-label="关闭" @click="closeDialog">×</button>
      </div>
      <p class="conflict-dialog-summary">
        <span class="conflict-dialog-files">{{ conflictPaths.join("、") }}</span>
        存在冲突，请选择编辑方式：
      </p>

      <div class="conflict-dialog-options">
        <button type="button" class="conflict-option-card" @click="pickMode('vim')">
          <span class="conflict-option-icon conflict-option-icon--vim" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" />
            </svg>
          </span>
          <span class="conflict-option-name">极简 Vim</span>
          <span class="conflict-option-desc">i 编辑，:wq 保存</span>
        </button>
        <button type="button" class="conflict-option-card" @click="pickMode('visual')">
          <span class="conflict-option-icon conflict-option-icon--visual" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </span>
          <span class="conflict-option-name">可视化编辑器</span>
          <span class="conflict-option-desc">高亮冲突，一键取某一方</span>
        </button>
      </div>
    </div>
  </div>
</template>
