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
      <h2 class="conflict-dialog-title">需要解决冲突</h2>
      <p class="conflict-dialog-summary">
        <span class="conflict-dialog-files">{{ conflictPaths.join("、") }}</span>
        存在冲突，请选择编辑方式：
      </p>

      <div class="conflict-dialog-options">
        <button type="button" class="conflict-option-card" @click="pickMode('vim')">
          <span class="conflict-option-icon">⌨</span>
          <span class="conflict-option-name">极简 Vim</span>
          <span class="conflict-option-desc">i 编辑，:wq 保存</span>
        </button>
        <button type="button" class="conflict-option-card" @click="pickMode('visual')">
          <span class="conflict-option-icon">✎</span>
          <span class="conflict-option-name">可视化编辑器</span>
          <span class="conflict-option-desc">高亮冲突，一键取某一方</span>
        </button>
      </div>
    </div>
  </div>
</template>
