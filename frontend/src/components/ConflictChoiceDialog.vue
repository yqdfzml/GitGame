<script setup lang="ts">
/**
 * 冲突解决方式选择弹窗。
 * 功能：合并冲突后提示玩家选择极简 Vim 或可视化编辑器。
 */

const props = defineProps<{
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
 * 关闭弹窗。
 * 功能：点击遮罩或取消时隐藏选择框。
 * 参数：无。
 * 返回值：无。
 */
const closeDialog = () => {
  emit("update:show", false);
};

/**
 * 确认编辑方式并打开对应编辑器。
 * 功能：向父组件传递 vim 或 visual 选择。
 * 参数：mode - 玩家选中的编辑模式。
 * 返回值：无。
 */
const pickMode = (mode: "vim" | "visual") => {
  emit("choose", mode);
  emit("update:show", false);
};
</script>

<template>
  <div v-if="show" class="conflict-dialog-overlay" @click.self="closeDialog">
    <div class="conflict-dialog card">
      <h2 class="conflict-dialog-title">检测到合并冲突</h2>
      <p class="conflict-dialog-desc">
        命令无法自动完成合并，需要手动编辑冲突文件后才能继续。
      </p>
      <p class="conflict-dialog-files">
        冲突文件：{{ conflictPaths.join("、") }}
      </p>
      <p class="conflict-dialog-hint">
        请选择你喜欢的解决方式：
      </p>

      <div class="conflict-dialog-options">
        <button type="button" class="conflict-option-card" @click="pickMode('vim')">
          <span class="conflict-option-icon">⌨</span>
          <span class="conflict-option-name">极简 Vim</span>
          <span class="conflict-option-desc">
            在终端内模拟 Vim，支持 i 编辑、:wq 保存、:q! 放弃
          </span>
        </button>
        <button type="button" class="conflict-option-card" @click="pickMode('visual')">
          <span class="conflict-option-icon">✎</span>
          <span class="conflict-option-name">可视化编辑器</span>
          <span class="conflict-option-desc">
            图形界面高亮冲突标记，可一键取我方或对方版本
          </span>
        </button>
      </div>

      <p class="conflict-dialog-note">
        也可使用 <code>git checkout --ours/--theirs 文件</code> 快捷选取一方，或输入 <code>vim 文件名</code> 打开 Vim。
      </p>

      <button type="button" class="btn-ghost conflict-dialog-later" @click="closeDialog">
        稍后处理
      </button>
    </div>
  </div>
</template>
